import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  assertSupportedSourceMetadata,
  assertSourceDuration,
  clampNumber,
  detectSourceKind,
  extractVideoDetails,
  formatMeta,
  normalizeTags,
  resolveSourceUrl,
  simplifyYtDlpStage,
} from "../../utils/clip-utils.js";
import { normalizeError } from "../../utils/http.js";
import { buildRetrieveQualityMetadata } from "../../utils/retrieve-quality.js";
import {
  assertToolsAvailable,
  downloadSourceVideo,
  getPreviewAssetDescriptor,
  probeDuration,
  readRemoteMetadata,
  readSessionMetadata,
} from "../../media/media-pipeline.js";
import { updateJob } from "../../jobs/job-store.js";
import { presentEditorSession } from "../../presenters/editor-session-presenter.js";
import {
  findSourceRecordByUrl,
  getSourceDirectory,
  resolveSourceOwnedPath,
  writeSourceRecord,
} from "../../storage/source-repository.js";
import { fileExists } from "../../utils/filesystem.js";
import { createSessionFromSourceRecord } from "../sessions/session-service.js";

export async function runIngestionWorkflow(jobId, workspaceId, request) {
  let sourceDir = "";

  try {
    updateJob(jobId, {
      status: "running",
      stage: "Checking local media tools...",
      progress: 6,
    });
    await assertToolsAvailable("retrieve-tools");

    updateJob(jobId, {
      stage: "Checking source details...",
      progress: 9,
    });

    const requestedSourceKind = detectSourceKind({
      requestUrl: request.url,
    });
    const cachedSource = await findSourceRecordByUrl(
      workspaceId,
      request.url,
      requestedSourceKind,
      request.quality,
    );

    if (await canReuseSourceRecord(workspaceId, cachedSource)) {
      updateJob(jobId, {
        stage: "Reusing cached source media...",
        progress: 82,
      });
      await completeIngestionJob(jobId, workspaceId, cachedSource);
      return;
    }

    const remoteMetadata = await readRemoteMetadata(request.url);
    assertSupportedSourceMetadata(remoteMetadata);
    const sourceKind = detectSourceKind({
      requestUrl: request.url,
      metadata: remoteMetadata,
    });
    const sourceUrl = resolveSourceUrl(request.url, remoteMetadata, sourceKind);
    const reusableSource = await findSourceRecordByUrl(
      workspaceId,
      sourceUrl,
      sourceKind,
      request.quality,
    );

    if (await canReuseSourceRecord(workspaceId, reusableSource)) {
      updateJob(jobId, {
        stage: "Reusing cached source media...",
        progress: 82,
      });
      await completeIngestionJob(jobId, workspaceId, reusableSource);
      return;
    }

    const sourceId = crypto.randomUUID();
    sourceDir = getSourceDirectory(workspaceId, sourceId);

    updateJob(jobId, {
      stage: "Downloading source video...",
      progress: 10,
    });

    const sourcePath = await downloadSourceVideo(
      request.url,
      sourceDir,
      {
        requestedQuality: request.quality,
        sourceKind,
      },
      (percent, line) => {
        updateJob(jobId, {
          stage: simplifyYtDlpStage(line, "Downloading source video..."),
          progress: clampNumber(10 + Math.round(percent * 0.62), 10, 72),
        });
      },
    );

    const downloadMetadata = await readSessionMetadata(sourceDir).catch(() => ({}));
    const metadata = {
      ...remoteMetadata,
      ...downloadMetadata,
    };

    updateJob(jobId, {
      stage: "Preparing editor preview...",
      progress: 78,
    });

    const previewAsset = await getPreviewAssetDescriptor(
      sourcePath,
      sourceDir,
      (progress) => {
        updateJob(jobId, {
          stage: "Preparing editor preview...",
          progress: clampNumber(86 + Math.round(progress * 0.12), 86, 98),
        });
      },
    );
    const durationSeconds =
      metadata.duration ?? (await probeDuration(sourcePath));
    assertSourceDuration(durationSeconds);

    const sourceRecord = {
      sourceId,
      sourceType: "remote-source",
      originType: "remote",
      sourceKind,
      sourceUrl,
      title: metadata.title ?? "Retrieved clip",
      metaSummary: formatMeta(metadata, durationSeconds, sourceUrl),
      thumbnailUrl: metadata.thumbnail ?? "",
      tags: normalizeTags(metadata.tags),
      videoDetails: extractVideoDetails(metadata),
      durationSeconds,
      createdAt: new Date().toISOString(),
      retrieveQuality: buildRetrieveQualityMetadata(metadata, request.quality),
      media: {
        source: {
          fileName: path.basename(sourcePath),
        },
        preview: {
          fileName: path.basename(previewAsset.filePath),
          mimeType: previewAsset.mimeType,
        },
        subtitle: null,
      },
    };

    await writeSourceRecord(workspaceId, sourceRecord);
    await completeIngestionJob(jobId, workspaceId, sourceRecord);
  } catch (error) {
    if (sourceDir) {
      await fs.rm(sourceDir, { recursive: true, force: true }).catch(() => {});
    }

    updateJob(jobId, {
      status: "failed",
      stage: "Retrieve failed.",
      progress: 0,
      error: normalizeError(error),
    });
  }
}

async function completeIngestionJob(jobId, workspaceId, sourceRecord) {
  const sessionRecord = await createSessionFromSourceRecord(
    workspaceId,
    sourceRecord,
    {
      selection: {
        startSeconds: 0,
        endSeconds: sourceRecord.durationSeconds,
        headSeconds: 0,
      },
    },
  );

  updateJob(jobId, {
    status: "completed",
    stage: "Clip ready in the editor.",
    progress: 100,
    result: presentEditorSession(sessionRecord),
  });
}

async function canReuseSourceRecord(workspaceId, sourceRecord) {
  if (!sourceRecord?.sourceId || !sourceRecord?.media?.source || !sourceRecord?.media?.preview) {
    return false;
  }

  const sourcePath = resolveSourceOwnedPath(
    workspaceId,
    sourceRecord.sourceId,
    sourceRecord.media.source.fileName,
  );
  const previewPath = resolveSourceOwnedPath(
    workspaceId,
    sourceRecord.sourceId,
    sourceRecord.media.preview.fileName,
  );

  return (await fileExists(sourcePath)) && (await fileExists(previewPath));
}
