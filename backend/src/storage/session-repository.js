import fs from "node:fs/promises";
import path from "node:path";

import {
  detectSourceKind,
  extractVideoDetails,
  formatMeta,
  normalizeSourceKind,
  normalizeTags,
} from "../utils/clip-utils.js";
import { fileExists } from "../utils/filesystem.js";
import { normalizeRetrieveQualityMetadata } from "../utils/retrieve-quality.js";
import {
  findSubtitleFile,
  probeDuration,
  readSessionMetadata,
  resolvePreviewPath,
  resolveSourceFile,
} from "../media/media-pipeline.js";
import { resolveSourceOwnedPath } from "./source-repository.js";
import { resolveSessionDirectory } from "./workspace-paths.js";

export async function writeSessionRecord(workspaceId, record) {
  const sessionDir = await resolveSessionDirectory(workspaceId, record.sessionId);
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(
    path.join(sessionDir, "session.json"),
    JSON.stringify(normalizeSessionRecord(record), null, 2),
  );
}

export async function readSessionRecord(workspaceId, sessionId) {
  const sessionDir = await resolveSessionDirectory(workspaceId, sessionId);
  const recordPath = path.join(sessionDir, "session.json");
  const contents = await fs.readFile(recordPath, "utf8").catch(() => "");

  if (contents) {
    const parsed = JSON.parse(contents);
    return normalizeSessionRecord(parsed && typeof parsed === "object" ? parsed : null);
  }

  if (!(await fileExists(sessionDir))) {
    return null;
  }

  return buildLegacySessionRecord(sessionId, sessionDir);
}

export async function resolveSessionMediaPath(
  workspaceId,
  sessionId,
  fileName,
  sessionRecord = null,
) {
  const resolvedRecord =
    sessionRecord ?? (await readSessionRecord(workspaceId, sessionId));

  if (!resolvedRecord) {
    return "";
  }

  for (const descriptor of [
    resolvedRecord.media?.preview,
    resolvedRecord.media?.source,
    resolvedRecord.media?.subtitle,
  ]) {
    if (!descriptor || descriptor.fileName !== fileName) {
      continue;
    }

    return resolveDescriptorPath(workspaceId, sessionId, resolvedRecord, descriptor);
  }

  return "";
}

export async function resolveSessionSourcePath(
  workspaceId,
  sessionId,
  sessionRecord = null,
) {
  const resolvedRecord =
    sessionRecord ?? (await readSessionRecord(workspaceId, sessionId));

  if (!resolvedRecord?.media?.source) {
    return "";
  }

  return resolveDescriptorPath(
    workspaceId,
    sessionId,
    resolvedRecord,
    resolvedRecord.media.source,
  );
}

async function resolveDescriptorPath(workspaceId, sessionId, sessionRecord, descriptor) {
  if (descriptor.ownerType === "source" && sessionRecord.sourceId) {
    return resolveSourceOwnedPath(
      workspaceId,
      sessionRecord.sourceId,
      descriptor.fileName,
    );
  }

  const sessionDir = await resolveSessionDirectory(workspaceId, sessionId);
  return path.join(sessionDir, descriptor.fileName);
}

function normalizeSessionRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  return {
    ...record,
    sourceKind: normalizeSourceKind(
      record.sourceKind ?? detectSourceKind({ requestUrl: record.sourceUrl }),
    ),
    retrieveQuality: normalizeRetrieveQualityMetadata(record.retrieveQuality),
  };
}

async function buildLegacySessionRecord(sessionId, sessionDir) {
  const sourcePath = await resolveSourceFile(sessionDir);
  const previewPath = await resolvePreviewPath(sessionDir, sourcePath);
  const subtitlePath = await findSubtitleFile(sessionDir);
  const duration = await probeDuration(sourcePath);
  const metadata = await readSessionMetadata(sessionDir);
  const sourceUrl = String(metadata.webpage_url ?? "").trim();

  return {
    sessionId,
    sourceId: metadata.id ? `legacy-${metadata.id}` : `legacy-${sessionId}`,
    sourceType: "cached-session",
    originType: sourceUrl ? "remote" : "export-derived",
    sourceKind: detectSourceKind({ requestUrl: sourceUrl, metadata }),
    sourceUrl,
    title: metadata.title ?? "Retrieved clip",
    metaSummary: formatMeta(metadata, duration, sourceUrl),
    thumbnailUrl: metadata.thumbnail ?? "",
    tags: normalizeTags(metadata.tags),
    videoDetails: extractVideoDetails(metadata),
    durationSeconds: duration,
    selection: {
      startSeconds: 0,
      endSeconds: duration,
      headSeconds: 0,
    },
    lineage: sourceUrl ? { remoteSourceId: metadata.id ?? "" } : null,
    media: {
      source: {
        ownerType: "session",
        fileName: path.basename(sourcePath),
      },
      preview: {
        ownerType: "session",
        fileName: path.basename(previewPath),
        mimeType: guessPreviewMimeType(previewPath),
      },
      subtitle: subtitlePath
        ? {
            ownerType: "session",
            fileName: path.basename(subtitlePath),
            kind: "captions",
            srcLang: "en",
            label: "English captions",
          }
        : null,
    },
  };
}

function guessPreviewMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".webm":
      return "video/webm";
    case ".ogv":
      return "video/ogg";
    default:
      return "video/mp4";
  }
}
