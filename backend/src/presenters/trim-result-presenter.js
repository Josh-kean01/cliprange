import { presentHistoryEntry } from "./history-entry-presenter.js";

export function presentTrimResult(entry) {
  const historyEntry = presentHistoryEntry(entry);

  return {
    resultId: entry.entryId,
    outputMode: entry.kind,
    historyEntry,
    artifactState: entry.kind === "draft" ? "saved" : "rendered",
    download: entry.artifact?.downloadUrl
      ? {
          url: entry.artifact.downloadUrl,
          fileName: entry.artifact.fileName ?? "",
        }
      : null,
    share: entry.artifact?.shareUrl
      ? {
          url: entry.artifact.shareUrl,
          openUrl: entry.artifact.shareUrl,
        }
      : null,
    notes: entry.notes ?? [],
    lineage: entry.lineage ?? null,
  };
}
