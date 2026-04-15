import crypto from "node:crypto";
import path from "node:path";

import {
  buildCommentTag,
  buildVideoFilter,
  clampNumber,
  sanitizeFilePart,
} from "../../utils/clip-utils.js";
import { createAppError, normalizeError } from "../../utils/http.js";
import {
  assertToolsAvailable,
  buildExportPlan,
  ensureSubtitleFile,
  findSubtitleFile,
  renderClip,
  trimClipFastCopy,
  validateRenderFilter,
} from "../../media/media-pipeline.js";
import { updateJob } from "../../jobs/job-store.js";
import { presentTrimResult } from "../../presenters/trim-result-presenter.js";
import { appendHistoryEntry } from "../../storage/history-repository.js";
import { upsertShareIndexEntry } from "../../storage/share-index-repository.js";
import {
  readSessionRecord,
  resolveSessionSourcePath,
  writeSessionRecord,
} from "../../storage/session-repository.js";
import {
  readSourceRecord,
  writeSourceRecord,
} from "../../storage/source-repository.js";
import { getWorkspacePaths } from "../../storage/workspace-paths.js";

export async function runExportWorkflow(jobId, workspaceId, request) {
  try {
    updateJob(jobId, {
      status: "running",
      stage: "Loading source clip...",
      progress: 8,
    });

    const sessionRecord = await readSessionRecord(workspaceId, request.sessionId);

    if (!sessionRecord) {
      throw createAppError({
        statusCode: 400,
        code: "SESSION_EXPIRED",
        stage: "load-session",
        message: "The loaded clip expired. Retrieve it again before exporting.",
        userMessage:
          "The loaded clip expired. Retrieve it again before exporting.",
      });
    }

    const clipDuration =
      request.selection.endSeconds - request.selection.startSeconds;
    const sourceTitle = sessionRecord.title || "Retrieved clip";
    const sourceUrl = sessionRecord.sourceUrl || "";
    const thumbnailUrl = sessionRecord.thumbnailUrl || "";
    const tags = request.tags ?? [];
    const remoteSourceId =
      sessionRecord.lineage?.remoteSourceId || sessionRecord.sourceId || "";

    if (request.outputMode === "draft") {
      updateJob(jobId, {
        stage: "Saving highlight draft...",
        progress: 84,
      });

      const draftEntry = await appendHistoryEntry(workspaceId, {
        entryId: crypto.randomUUID(),
        kind: "draft",
        title: request.title || sourceTitle,
        sourceTitle,
        createdAt: new Date().toISOString(),
        selection: {
          startSeconds: request.selection.startSeconds,
          endSeconds: request.selection.endSeconds,
          durationSeconds: clipDuration,
        },
        sessionId: request.sessionId,
        sourceRef: {
          sourceId: sessionRecord.sourceId,
          sourceType: sessionRecord.sourceType,
          originType: sessionRecord.originType,
          sourceKind: sessionRecord.sourceKind,
          sourceUrl,
        },
        reopen: {
          strategy: "session",
          sessionId: request.sessionId,
        },
        thumbnailUrl,
        tags,
        artifact: {
          fileName: "",
          downloadUrl: "",
          shareUrl: "",
        },
        notes: ["Draft saved without rendering a new file."],
        lineage: {
          remoteSourceId,
          exportId: "",
        },
        options: {
          removeWatermark: request.watermarkPolicy.mode === "remove",
          autoSubtitles: request.subtitlePolicy.mode === "auto",
          subtitlesApplied: false,
          watermarkApplied: false,
        },
      });

      updateJob(jobId, {
        status: "completed",
        stage: "Draft saved to your library.",
        progress: 100,
        result: presentTrimResult(draftEntry),
      });
      return;
    }

    updateJob(jobId, {
      stage: "Checking local media tools...",
      progress: 14,
    });
    await assertToolsAvailable("export-tools");
    const sourcePath = await resolveSessionSourcePath(
      workspaceId,
      request.sessionId,
      sessionRecord,
    );

    let subtitlePath = "";
    if (request.subtitlePolicy.mode === "auto") {
      subtitlePath = await resolveSubtitlePathForExport({
        jobId,
        workspaceId,
        sessionRecord,
        sourcePath,
        sourceUrl,
      });
    }

    const clipId = crypto.randomUUID();
    const fileStem = sanitizeFilePart(
      request.title || sourceTitle || "cliprange-export",
    );
    const fileName = `${fileStem}-${clipId}.mp4`;
    const workspacePaths = getWorkspacePaths(workspaceId);
    const outputPath = path.join(workspacePaths.exportDir, fileName);
    const notes = [];
    const watermarkApplied = request.watermarkPolicy.mode !== "remove";
    let subtitlesApplied = Boolean(subtitlePath);
    let filter = buildVideoFilter({
      subtitlePath,
      includeWatermark: watermarkApplied,
    });

    if (subtitlesApplied) {
      const filterValid = await validateRenderFilter({
        inputPath: sourcePath,
        start: request.selection.startSeconds,
        duration: clipDuration,
        filter,
      });

      if (!filterValid) {
        subtitlesApplied = false;
        subtitlePath = "";
        notes.push(
          "Auto subtitles were requested but the source could not provide a burn-in track.",
        );
        filter = buildVideoFilter({
          subtitlePath: "",
          includeWatermark: watermarkApplied,
        });
      }
    }

    const exportPlan = await buildExportPlan({
      inputPath: sourcePath,
      subtitlePath,
      includeWatermark: watermarkApplied,
    });

    updateJob(jobId, {
      stage:
        exportPlan.mode === "copy"
          ? "Trimming clip quickly..."
          : "Rendering clip with ffmpeg...",
      progress: 32,
    });

    if (exportPlan.mode === "copy") {
      await trimClipFastCopy({
        inputPath: sourcePath,
        outputPath,
        start: request.selection.startSeconds,
        duration: clipDuration,
        title: request.title || sourceTitle,
        comment: buildCommentTag(
          {
            outputMode: request.outputMode,
          },
          {
            tags,
            subtitlesApplied,
            watermarkApplied,
          },
        ),
        onProgress: (percent) => {
          updateJob(jobId, {
            stage: "Trimming clip quickly...",
            progress: clampNumber(32 + Math.round(percent * 0.58), 32, 90),
          });
        },
      });
    } else {
      const renderTuning = getRenderTuning(sessionRecord);

      await renderClip({
        inputPath: sourcePath,
        outputPath,
        start: request.selection.startSeconds,
        duration: clipDuration,
        title: request.title || sourceTitle,
        comment: buildCommentTag(
          {
            outputMode: request.outputMode,
          },
          {
            tags,
            subtitlesApplied,
            watermarkApplied,
          },
        ),
        filter,
        videoPreset: renderTuning.preset,
        crf: renderTuning.crf,
        onProgress: (percent) => {
          updateJob(jobId, {
            stage: "Rendering clip with ffmpeg...",
            progress: clampNumber(32 + Math.round(percent * 0.58), 32, 90),
          });
        },
      });
    }

    updateJob(jobId, {
      stage:
        request.outputMode === "share"
          ? "Publishing share link..."
          : "Saving export history...",
      progress: 94,
    });

    const historyEntry = await appendHistoryEntry(workspaceId, {
      entryId: clipId,
      kind: request.outputMode,
      title: request.title || sourceTitle,
      sourceTitle,
      createdAt: new Date().toISOString(),
      selection: {
        startSeconds: request.selection.startSeconds,
        endSeconds: request.selection.endSeconds,
        durationSeconds: clipDuration,
      },
      sessionId: request.sessionId,
      sourceRef: {
        sourceId: sessionRecord.sourceId,
        sourceType: sessionRecord.sourceType,
        originType: sessionRecord.originType,
        sourceKind: sessionRecord.sourceKind,
        sourceUrl,
      },
      reopen: {
        strategy: "session",
        sessionId: request.sessionId,
      },
      thumbnailUrl,
      tags,
      artifact: {
        fileName,
        downloadUrl: `/media/export/${encodeURIComponent(fileName)}`,
        shareUrl: request.outputMode === "share" ? `/share/${clipId}` : "",
      },
      notes,
      lineage: {
        remoteSourceId,
        exportId: clipId,
      },
      options: {
        removeWatermark: request.watermarkPolicy.mode === "remove",
        autoSubtitles: request.subtitlePolicy.mode === "auto",
        subtitlesApplied,
        watermarkApplied,
      },
    });

    if (historyEntry.kind === "share") {
      await upsertShareIndexEntry(workspaceId, historyEntry);
    }

    updateJob(jobId, {
      status: "completed",
      stage:
        request.outputMode === "share"
          ? "Share link ready."
          : "Export ready to download.",
      progress: 100,
      result: presentTrimResult(historyEntry),
    });
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      stage: "Export failed.",
      progress: 0,
      error: normalizeError(error),
    });
  }
}

async function resolveSubtitlePathForExport({
  jobId,
  workspaceId,
  sessionRecord,
  sourcePath,
  sourceUrl,
}) {
  updateJob(jobId, {
    stage: "Checking subtitle track...",
    progress: 20,
  });

  let subtitlePath = await findSubtitleFile(path.dirname(sourcePath));

  if (subtitlePath) {
    if (!sessionRecord.media.subtitle) {
      await persistSubtitleDescriptor(
        workspaceId,
        sessionRecord,
        subtitlePath,
      );
    }

    return subtitlePath;
  }

  if (!sourceUrl) {
    return "";
  }

  updateJob(jobId, {
    stage: "Fetching subtitle track...",
    progress: 24,
  });

  subtitlePath = await ensureSubtitleFile(path.dirname(sourcePath), sourceUrl).catch(
    () => "",
  );

  if (!subtitlePath) {
    return "";
  }

  await persistSubtitleDescriptor(
    workspaceId,
    sessionRecord,
    subtitlePath,
  );
  return subtitlePath;
}

async function persistSubtitleDescriptor(
  workspaceId,
  sessionRecord,
  subtitlePath,
) {
  const fileName = path.basename(subtitlePath);
  const descriptor = {
    ownerType:
      sessionRecord.media.source?.ownerType === "source" ? "source" : "session",
    fileName,
    kind: "captions",
    srcLang: "en",
    label: "English captions",
  };

  sessionRecord.media = {
    ...sessionRecord.media,
    subtitle: descriptor,
  };

  await writeSessionRecord(workspaceId, {
    ...sessionRecord,
    media: sessionRecord.media,
  });

  if (descriptor.ownerType !== "source" || !sessionRecord.sourceId) {
    return;
  }

  const sourceRecord = await readSourceRecord(workspaceId, sessionRecord.sourceId);

  if (!sourceRecord) {
    return;
  }

  await writeSourceRecord(workspaceId, {
    ...sourceRecord,
    media: {
      ...sourceRecord.media,
      subtitle: {
        fileName,
        kind: "captions",
        srcLang: "en",
        label: "English captions",
      },
    },
  });
}

function getRenderTuning(sessionRecord) {
  const sourceHeight = Number(sessionRecord?.retrieveQuality?.actual?.value) || 0;

  if (sourceHeight >= 1440) {
    return {
      preset: "superfast",
      crf: 24,
    };
  }

  return {
    preset: "veryfast",
    crf: 23,
  };
}
