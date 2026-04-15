import fs from "node:fs/promises";
import path from "node:path";

import { MAX_HISTORY_ITEMS } from "../config/runtime.js";
import {
  detectSourceKind,
  normalizeOutputMode,
  normalizeSourceKind,
} from "../utils/clip-utils.js";
import { getWorkspacePaths } from "./workspace-paths.js";

export async function readHistoryEntries(workspaceId) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const contents = await fs.readFile(workspacePaths.historyPath, "utf8").catch(
    () => "[]",
  );
  const parsed = JSON.parse(contents);
  const items = Array.isArray(parsed) ? parsed : [];
  return items.map(normalizeHistoryRecord).filter(Boolean);
}

export async function writeHistoryEntries(workspaceId, items) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  await fs.writeFile(workspacePaths.historyPath, JSON.stringify(items, null, 2));
}

export async function appendHistoryEntry(workspaceId, entry) {
  const nextEntry = normalizeHistoryRecord(entry);
  const items = await readHistoryEntries(workspaceId);
  const next = [nextEntry, ...items.filter((item) => item.entryId !== nextEntry.entryId)]
    .slice(0, MAX_HISTORY_ITEMS);
  await writeHistoryEntries(workspaceId, next);
  return nextEntry;
}

export async function findHistoryEntry(workspaceId, entryId) {
  const items = await readHistoryEntries(workspaceId);
  return items.find((item) => item.entryId === String(entryId ?? "").trim()) ?? null;
}

export async function findHistoryEntryByFileName(workspaceId, fileName) {
  const items = await readHistoryEntries(workspaceId);
  return (
    items.find((item) => item.artifact.fileName === String(fileName ?? "").trim()) ??
    null
  );
}

export function normalizeHistoryRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const entryId = String(record.entryId ?? record.clipId ?? "").trim();

  if (!entryId) {
    return null;
  }

  const kind = normalizeOutputMode(record.kind ?? record.outputMode ?? "download");
  const startSeconds = Number(record.selection?.startSeconds ?? record.start ?? 0);
  const endSeconds = Number(record.selection?.endSeconds ?? record.end ?? 0);
  const durationSeconds =
    Number(record.selection?.durationSeconds ?? record.duration) ||
    Math.max(0, endSeconds - startSeconds);

  const fileName = String(record.artifact?.fileName ?? record.fileName ?? "").trim();
  const downloadUrl =
    String(record.artifact?.downloadUrl ?? record.downloadUrl ?? "").trim() ||
    (fileName ? `/media/export/${encodeURIComponent(fileName)}` : "");
  const shareUrl = String(record.artifact?.shareUrl ?? record.shareUrl ?? "").trim();

  return {
    entryId,
    kind,
    title: String(record.title ?? "").trim() || "Untitled clip",
    sourceTitle: String(record.sourceTitle ?? record.title ?? "").trim(),
    createdAt: String(record.createdAt ?? new Date().toISOString()),
    selection: {
      startSeconds,
      endSeconds,
      durationSeconds,
    },
    sessionId: String(record.sessionId ?? record.reopen?.sessionId ?? "").trim(),
    sourceRef: {
      sourceId:
        String(record.sourceRef?.sourceId ?? record.sourceId ?? record.sessionId ?? entryId).trim(),
      sourceType:
        String(
          record.sourceRef?.sourceType ??
            (kind === "draft" ? "cached-session" : "rendered-export"),
        ).trim() || "cached-session",
      originType:
        String(
          record.sourceRef?.originType ??
            (record.lineage?.exportId ? "export-derived" : "remote"),
        ).trim() || "remote",
      sourceKind: normalizeSourceKind(
        record.sourceRef?.sourceKind ??
          detectSourceKind({
            requestUrl: record.sourceRef?.sourceUrl ?? record.sourceUrl,
          }),
      ),
      sourceUrl:
        String(record.sourceRef?.sourceUrl ?? record.sourceUrl ?? "").trim(),
    },
    reopen: {
      strategy: String(record.reopen?.strategy ?? "session").trim() || "session",
      sessionId: String(record.reopen?.sessionId ?? record.sessionId ?? "").trim(),
    },
    thumbnailUrl: String(record.thumbnailUrl ?? "").trim(),
    tags: Array.isArray(record.tags) ? record.tags : [],
    artifact: {
      fileName,
      downloadUrl,
      shareUrl,
    },
    notes: Array.isArray(record.notes) ? record.notes : [],
    lineage: record.lineage ?? {
      remoteSourceId: String(record.remoteSourceId ?? "").trim(),
      exportId: kind === "draft" ? "" : entryId,
    },
    options: {
      removeWatermark: Boolean(
        record.options?.removeWatermark ?? record.removeWatermark,
      ),
      autoSubtitles: Boolean(
        record.options?.autoSubtitles ?? record.autoSubtitles,
      ),
      subtitlesApplied: Boolean(
        record.options?.subtitlesApplied ?? record.subtitlesApplied,
      ),
      watermarkApplied: Boolean(
        record.options?.watermarkApplied ?? record.watermarkApplied,
      ),
    },
  };
}
