import fs from "node:fs/promises";
import path from "node:path";

import {
  assertSafePathSegment,
  detectSourceKind,
  extractYouTubeId,
  normalizeSourceKind,
} from "../utils/clip-utils.js";
import { fileExists } from "../utils/filesystem.js";
import {
  normalizeRetrieveQuality,
  normalizeRetrieveQualityMetadata,
} from "../utils/retrieve-quality.js";
import { getWorkspacePaths } from "./workspace-paths.js";

export function getSourceDirectory(workspaceId, sourceId) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  return path.join(
    workspacePaths.sourcesDir,
    assertSafePathSegment(sourceId, "source"),
  );
}

export function getSourceRecordPath(workspaceId, sourceId) {
  return path.join(getSourceDirectory(workspaceId, sourceId), "source.json");
}

export async function writeSourceRecord(workspaceId, record) {
  const sourceDir = getSourceDirectory(workspaceId, record.sourceId);
  const sourceKind = normalizeSourceKind(record.sourceKind);
  const retrieveQuality = normalizeRetrieveQualityMetadata(record.retrieveQuality);
  const normalizedRecord = {
    ...record,
    sourceKind,
    retrieveQuality,
    sourceUrlKey:
      record.sourceUrlKey ||
      normalizeSourceUrlKey(
        record.sourceUrl ?? "",
        sourceKind,
        retrieveQuality?.requested?.key,
      ),
  };
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(
    getSourceRecordPath(workspaceId, record.sourceId),
    JSON.stringify(normalizedRecord, null, 2),
  );
}

export async function readSourceRecord(workspaceId, sourceId) {
  const sourcePath = getSourceRecordPath(workspaceId, sourceId);
  const contents = await fs.readFile(sourcePath, "utf8").catch(() => "");

  if (!contents) {
    return null;
  }

  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return {
    ...parsed,
    sourceKind: normalizeSourceKind(
      parsed.sourceKind ?? detectSourceKind({ requestUrl: parsed.sourceUrl }),
    ),
    retrieveQuality: normalizeRetrieveQualityMetadata(parsed.retrieveQuality),
  };
}

export function resolveSourceOwnedPath(workspaceId, sourceId, fileName) {
  return path.join(
    getSourceDirectory(workspaceId, sourceId),
    assertSafePathSegment(fileName, "source asset"),
  );
}

export async function sourceRecordExists(workspaceId, sourceId) {
  return fileExists(getSourceRecordPath(workspaceId, sourceId));
}

export async function findSourceRecordByUrl(
  workspaceId,
  sourceUrl,
  sourceKind = "video",
  requestedQuality = "",
) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const sourceUrlKey = normalizeSourceUrlKey(
    sourceUrl,
    sourceKind,
    normalizeRetrieveQuality(requestedQuality),
  );

  if (!sourceUrlKey) {
    return null;
  }

  const entries = await fs
    .readdir(workspacePaths.sourcesDir, { withFileTypes: true })
    .catch(() => []);
  let match = null;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const record = await readSourceRecord(workspaceId, entry.name);

    if (!record) {
      continue;
    }

    const recordKey =
      normalizeSourceUrlKey(
        record.sourceUrl,
        record.sourceKind,
        record.retrieveQuality?.requested?.key,
      ) ||
      record.sourceUrlKey;

    if (recordKey !== sourceUrlKey) {
      continue;
    }

    if (!match || String(record.createdAt ?? "") > String(match.createdAt ?? "")) {
      match = record;
    }
  }

  return match;
}

export function normalizeSourceUrlKey(
  sourceUrl,
  sourceKind = "video",
  requestedQuality = "",
) {
  const trimmed = String(sourceUrl ?? "").trim();
  const normalizedKind = normalizeSourceKind(sourceKind);
  const qualitySuffix = String(requestedQuality ?? "").trim();

  if (!trimmed) {
    return "";
  }

  const videoId = extractYouTubeId(trimmed);

  if (videoId) {
    return qualitySuffix
      ? `youtube:${normalizedKind}:${videoId}:${qualitySuffix}`
      : `youtube:${normalizedKind}:${videoId}`;
  }

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    return qualitySuffix ? `${parsed.toString()}#quality=${qualitySuffix}` : parsed.toString();
  } catch {
    return qualitySuffix ? `${trimmed}#quality=${qualitySuffix}` : trimmed;
  }
}
