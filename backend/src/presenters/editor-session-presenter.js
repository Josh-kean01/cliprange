function encodePathSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

export function presentEditorSession(sessionRecord) {
  const subtitleTrack = sessionRecord.media.subtitle
    ? {
        assetUrl: `/media/session/${encodePathSegment(sessionRecord.sessionId)}/${encodePathSegment(sessionRecord.media.subtitle.fileName)}`,
        kind: "captions",
        srcLang: sessionRecord.media.subtitle.srcLang ?? "en",
        label: sessionRecord.media.subtitle.label ?? "English captions",
      }
    : null;

  return {
    sessionId: sessionRecord.sessionId,
    title: sessionRecord.title,
    metaSummary: sessionRecord.metaSummary ?? "",
    durationSeconds: sessionRecord.durationSeconds,
    source: {
      sourceId: sessionRecord.sourceId,
      sourceType: sessionRecord.sourceType,
      originType: sessionRecord.originType,
      sourceKind: sessionRecord.sourceKind ?? "video",
      sourceUrl: sessionRecord.sourceUrl ?? "",
      requestedQuality: sessionRecord.retrieveQuality?.requested ?? null,
      retrievedQuality: sessionRecord.retrieveQuality?.actual ?? null,
    },
    preview: {
      assetUrl: `/media/session/${encodePathSegment(sessionRecord.sessionId)}/${encodePathSegment(sessionRecord.media.preview.fileName)}`,
      mimeType: sessionRecord.media.preview.mimeType ?? "video/mp4",
      posterUrl: sessionRecord.thumbnailUrl ?? "",
    },
    selection: {
      startSeconds: sessionRecord.selection.startSeconds,
      endSeconds: sessionRecord.selection.endSeconds,
      headSeconds: sessionRecord.selection.headSeconds,
    },
    capabilities: {
      canSaveDraft: true,
      canDownload: true,
      canShare: true,
      hasSubtitles: Boolean(subtitleTrack),
    },
    thumbnailUrl: sessionRecord.thumbnailUrl ?? "",
    subtitleTrack,
    tags: sessionRecord.tags ?? [],
    videoDetails: sessionRecord.videoDetails ?? null,
    lineage: sessionRecord.lineage ?? null,
  };
}
