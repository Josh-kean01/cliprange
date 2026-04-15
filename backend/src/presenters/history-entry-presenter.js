export function presentHistoryEntry(entry) {
  return {
    entryId: entry.entryId,
    kind: entry.kind,
    title: entry.title,
    sourceTitle: entry.sourceTitle ?? "",
    createdAt: entry.createdAt,
    selection: {
      startSeconds: entry.selection.startSeconds,
      endSeconds: entry.selection.endSeconds,
      durationSeconds: entry.selection.durationSeconds,
    },
    sourceRef: {
      sourceId: entry.sourceRef.sourceId,
      sourceType: entry.sourceRef.sourceType,
      originType: entry.sourceRef.originType,
      sourceKind: entry.sourceRef.sourceKind ?? "video",
      sourceUrl: entry.sourceRef.sourceUrl ?? "",
    },
    reopen: {
      strategy: entry.reopen.strategy,
      sessionId: entry.reopen.sessionId ?? "",
    },
    thumbnailUrl: entry.thumbnailUrl ?? "",
    tags: entry.tags ?? [],
    downloadUrl: entry.artifact?.downloadUrl ?? "",
    shareUrl: entry.artifact?.shareUrl ?? "",
    fileName: entry.artifact?.fileName ?? "",
    notes: entry.notes ?? [],
    lineage: entry.lineage ?? null,
    options: entry.options ?? {
      removeWatermark: true,
      autoSubtitles: false,
      subtitlesApplied: false,
      watermarkApplied: false,
    },
  };
}
