import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { probeDuration, readSessionMetadata } from "../../media/media-pipeline.js";
import {
  extractVideoDetails,
  normalizeSourceKind,
} from "../../utils/clip-utils.js";
import { fileExists } from "../../utils/filesystem.js";
import {
  getSourceDirectory,
  readSourceRecord,
  resolveSourceOwnedPath,
} from "../../storage/source-repository.js";
import {
  readSessionRecord,
  writeSessionRecord,
} from "../../storage/session-repository.js";
import {
  getWorkspacePaths,
  resolveSessionDirectory,
} from "../../storage/workspace-paths.js";

export async function createSessionFromSourceRecord(
  workspaceId,
  sourceRecord,
  options = {},
) {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const title = options.title ?? sourceRecord.title;
  const videoDetails =
    sourceRecord.videoDetails ??
    (await readSessionMetadata(getSourceDirectory(workspaceId, sourceRecord.sourceId))
      .then((metadata) => extractVideoDetails(metadata))
      .catch(() => null));
  const startSeconds = Number(options.selection?.startSeconds ?? 0);
  const endSeconds = Number(
    options.selection?.endSeconds ?? sourceRecord.durationSeconds,
  );
  const headSeconds = Number(options.selection?.headSeconds ?? startSeconds);

  const record = {
    sessionId,
    sourceId: sourceRecord.sourceId,
    sourceType: "cached-session",
    originType: options.originType ?? "remote",
    sourceKind: normalizeSourceKind(sourceRecord.sourceKind),
    sourceUrl: sourceRecord.sourceUrl ?? "",
    title,
    metaSummary: sourceRecord.metaSummary ?? "",
    thumbnailUrl: sourceRecord.thumbnailUrl ?? "",
    tags: sourceRecord.tags ?? [],
    videoDetails,
    durationSeconds: sourceRecord.durationSeconds,
    selection: {
      startSeconds,
      endSeconds,
      headSeconds,
    },
    lineage:
      options.lineage ?? {
        remoteSourceId: sourceRecord.sourceId,
        exportId: "",
      },
    retrieveQuality: sourceRecord.retrieveQuality ?? null,
    media: {
      source: {
        ownerType: "source",
        fileName: sourceRecord.media.source.fileName,
      },
      preview: {
        ownerType: "source",
        fileName: sourceRecord.media.preview.fileName,
        mimeType: sourceRecord.media.preview.mimeType ?? "video/mp4",
      },
      subtitle: sourceRecord.media.subtitle
        ? {
            ownerType: "source",
            fileName: sourceRecord.media.subtitle.fileName,
            kind: sourceRecord.media.subtitle.kind ?? "captions",
            srcLang: sourceRecord.media.subtitle.srcLang ?? "en",
            label: sourceRecord.media.subtitle.label ?? "English captions",
          }
        : null,
    },
  };

  await writeSessionRecord(workspaceId, record);
  return record;
}

export async function cloneSessionRecord(workspaceId, sessionRecord, options = {}) {
  if (sessionRecord.media.source.ownerType === "source" && sessionRecord.sourceId) {
    const sourceRecord = await readSourceRecord(workspaceId, sessionRecord.sourceId);

    if (sourceRecord) {
      return createSessionFromSourceRecord(workspaceId, sourceRecord, {
        title: options.title ?? sessionRecord.title,
        selection: options.selection ?? sessionRecord.selection,
        lineage: options.lineage ?? sessionRecord.lineage,
        originType: options.originType ?? sessionRecord.originType,
      });
    }
  }

  return createSessionFromSessionAssets(workspaceId, sessionRecord, options);
}

export async function createSessionFromExportArtifact(
  workspaceId,
  entry,
  options = {},
) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const exportPath = path.join(workspacePaths.exportDir, entry.artifact.fileName);

  if (!(await fileExists(exportPath))) {
    throw new Error("The rendered clip is no longer available in exports.");
  }

  const sessionId = crypto.randomUUID();
  const sessionDir = await resolveSessionDirectory(workspaceId, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  const sourceFileName = "source.mp4";
  const sourcePath = path.join(sessionDir, sourceFileName);
  await fs.copyFile(exportPath, sourcePath);

  const durationSeconds =
    Number(entry.selection?.durationSeconds) || (await probeDuration(sourcePath));
  const record = {
    sessionId,
    sourceId:
      entry.sourceRef?.sourceId ||
      entry.lineage?.remoteSourceId ||
      `export-${entry.entryId}`,
    sourceType: "export-derived-source",
    originType: "export-derived",
    sourceKind: normalizeSourceKind(entry.sourceRef?.sourceKind),
    sourceUrl: entry.sourceRef?.sourceUrl ?? "",
    title: options.title ?? entry.title,
    metaSummary: entry.sourceTitle || entry.title,
    thumbnailUrl: entry.thumbnailUrl ?? "",
    tags: entry.tags ?? [],
    videoDetails: null,
    durationSeconds,
    selection: {
      startSeconds: 0,
      endSeconds: durationSeconds,
      headSeconds: 0,
    },
    lineage: {
      remoteSourceId: entry.lineage?.remoteSourceId ?? entry.sourceRef?.sourceId ?? "",
      exportId: entry.entryId,
    },
    retrieveQuality: null,
    media: {
      source: {
        ownerType: "session",
        fileName: sourceFileName,
      },
      preview: {
        ownerType: "session",
        fileName: sourceFileName,
        mimeType: "video/mp4",
      },
      subtitle: null,
    },
  };

  await writeSessionRecord(workspaceId, record);
  return record;
}

async function createSessionFromSessionAssets(
  workspaceId,
  sessionRecord,
  options,
) {
  const sessionId = crypto.randomUUID();
  const sessionDir = await resolveSessionDirectory(workspaceId, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });
  const originalSession = await readSessionRecord(workspaceId, sessionRecord.sessionId);

  const copyDescriptor = async (descriptor, suffix) => {
    if (!descriptor) {
      return null;
    }

    const sourcePath = descriptor.ownerType === "source"
      ? resolveSourceOwnedPath(workspaceId, sessionRecord.sourceId, descriptor.fileName)
      : path.join(
          await resolveSessionDirectory(workspaceId, sessionRecord.sessionId),
          descriptor.fileName,
        );
    const targetName =
      suffix && path.extname(descriptor.fileName)
        ? `${suffix}${path.extname(descriptor.fileName)}`
        : descriptor.fileName;
    const targetPath = path.join(sessionDir, targetName);
    await fs.copyFile(sourcePath, targetPath);

    return {
      ...descriptor,
      ownerType: "session",
      fileName: targetName,
    };
  };

  const record = {
    sessionId,
    sourceId: originalSession?.sourceId ?? sessionRecord.sourceId,
    sourceType: "cached-session",
    originType: options.originType ?? sessionRecord.originType,
    sourceKind: normalizeSourceKind(sessionRecord.sourceKind),
    sourceUrl: sessionRecord.sourceUrl ?? "",
    title: options.title ?? sessionRecord.title,
    metaSummary: sessionRecord.metaSummary ?? "",
    thumbnailUrl: sessionRecord.thumbnailUrl ?? "",
    tags: sessionRecord.tags ?? [],
    videoDetails: sessionRecord.videoDetails ?? null,
    durationSeconds: sessionRecord.durationSeconds,
    selection: options.selection ?? sessionRecord.selection,
    lineage: options.lineage ?? sessionRecord.lineage,
    retrieveQuality: sessionRecord.retrieveQuality ?? null,
    media: {
      source: await copyDescriptor(sessionRecord.media.source, "source"),
      preview: await copyDescriptor(sessionRecord.media.preview, "preview"),
      subtitle: await copyDescriptor(sessionRecord.media.subtitle, "subtitle"),
    },
  };

  await writeSessionRecord(workspaceId, record);
  return record;
}
