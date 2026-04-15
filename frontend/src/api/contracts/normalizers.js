import { detectYouTubeSourceKind } from "../../utils/cliprange";
import {
  normalizeRequestedQuality,
  normalizeRetrievedQuality,
} from "../../utils/retrieve-quality";

function asNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function asOptionalNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];
}

function normalizeVideoDetails(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const details = {
    videoId: String(payload?.videoId ?? "").trim(),
    description: String(payload?.description ?? "").trim(),
    uploaderName: String(payload?.uploaderName ?? "").trim(),
    uploaderId: String(payload?.uploaderId ?? "").trim(),
    uploaderUrl: String(payload?.uploaderUrl ?? "").trim(),
    channelName: String(payload?.channelName ?? "").trim(),
    channelId: String(payload?.channelId ?? "").trim(),
    channelUrl: String(payload?.channelUrl ?? "").trim(),
    uploadDate: String(payload?.uploadDate ?? "").trim(),
    releaseDate: String(payload?.releaseDate ?? "").trim(),
    viewCount: asOptionalNumber(payload?.viewCount),
    likeCount: asOptionalNumber(payload?.likeCount),
    commentCount: asOptionalNumber(payload?.commentCount),
    categories: normalizeStringList(payload?.categories),
    tags: normalizeStringList(payload?.tags),
  };

  return hasVideoDetails(details) ? details : null;
}

function normalizeSourceKind(value, sourceUrl = "") {
  return String(value ?? "").trim().toLowerCase() === "short"
    ? "short"
    : detectYouTubeSourceKind(sourceUrl);
}

export function normalizeEditorSession(payload) {
  const sourceUrl = String(payload?.source?.sourceUrl ?? "");

  return {
    sessionId: String(payload?.sessionId ?? ""),
    title: String(payload?.title ?? "").trim() || "Retrieved clip",
    metaSummary: String(payload?.metaSummary ?? "").trim(),
    durationSeconds: Math.max(0, asNumber(payload?.durationSeconds)),
    source: {
      sourceId: String(payload?.source?.sourceId ?? ""),
      sourceType: String(payload?.source?.sourceType ?? "cached-session"),
      originType: String(payload?.source?.originType ?? "remote"),
      sourceKind: normalizeSourceKind(payload?.source?.sourceKind, sourceUrl),
      sourceUrl,
      requestedQuality: normalizeRequestedQuality(payload?.source?.requestedQuality),
      retrievedQuality: normalizeRetrievedQuality(payload?.source?.retrievedQuality),
    },
    preview: {
      assetUrl: String(payload?.preview?.assetUrl ?? ""),
      mimeType: String(payload?.preview?.mimeType ?? "video/mp4"),
      posterUrl: String(payload?.preview?.posterUrl ?? ""),
    },
    selection: {
      startSeconds: Math.max(0, asNumber(payload?.selection?.startSeconds)),
      endSeconds: Math.max(0, asNumber(payload?.selection?.endSeconds)),
      headSeconds: Math.max(0, asNumber(payload?.selection?.headSeconds)),
    },
    capabilities: {
      canSaveDraft: Boolean(payload?.capabilities?.canSaveDraft),
      canDownload: Boolean(payload?.capabilities?.canDownload),
      canShare: Boolean(payload?.capabilities?.canShare),
      hasSubtitles: Boolean(payload?.capabilities?.hasSubtitles),
    },
    thumbnailUrl: String(payload?.thumbnailUrl ?? ""),
    subtitleTrack: payload?.subtitleTrack
      ? {
          assetUrl: String(payload.subtitleTrack.assetUrl ?? ""),
          kind: String(payload.subtitleTrack.kind ?? "captions"),
          srcLang: String(payload.subtitleTrack.srcLang ?? "en"),
          label: String(payload.subtitleTrack.label ?? "English captions"),
        }
      : null,
    tags: Array.isArray(payload?.tags) ? payload.tags : [],
    videoDetails: normalizeVideoDetails(payload?.videoDetails),
    lineage: payload?.lineage ?? null,
  };
}

export function normalizeHistoryEntry(payload) {
  const sourceUrl = String(payload?.sourceRef?.sourceUrl ?? "");

  return {
    entryId: String(payload?.entryId ?? ""),
    kind: String(payload?.kind ?? "download"),
    title: String(payload?.title ?? "").trim() || "Untitled clip",
    sourceTitle: String(payload?.sourceTitle ?? "").trim(),
    createdAt: String(payload?.createdAt ?? ""),
    selection: {
      startSeconds: Math.max(0, asNumber(payload?.selection?.startSeconds)),
      endSeconds: Math.max(0, asNumber(payload?.selection?.endSeconds)),
      durationSeconds: Math.max(
        0,
        asNumber(payload?.selection?.durationSeconds),
      ),
    },
    sourceRef: {
      sourceId: String(payload?.sourceRef?.sourceId ?? ""),
      sourceType: String(payload?.sourceRef?.sourceType ?? "cached-session"),
      originType: String(payload?.sourceRef?.originType ?? "remote"),
      sourceKind: normalizeSourceKind(payload?.sourceRef?.sourceKind, sourceUrl),
      sourceUrl,
    },
    reopen: {
      strategy: String(payload?.reopen?.strategy ?? "session"),
      sessionId: String(payload?.reopen?.sessionId ?? ""),
    },
    thumbnailUrl: String(payload?.thumbnailUrl ?? ""),
    tags: Array.isArray(payload?.tags) ? payload.tags : [],
    downloadUrl: String(payload?.downloadUrl ?? ""),
    shareUrl: String(payload?.shareUrl ?? ""),
    fileName: String(payload?.fileName ?? ""),
    notes: Array.isArray(payload?.notes) ? payload.notes : [],
    lineage: payload?.lineage ?? null,
    options: {
      removeWatermark: Boolean(payload?.options?.removeWatermark),
      autoSubtitles: Boolean(payload?.options?.autoSubtitles),
      subtitlesApplied: Boolean(payload?.options?.subtitlesApplied),
      watermarkApplied: Boolean(payload?.options?.watermarkApplied),
    },
  };
}

export function normalizeTrimResult(payload) {
  return {
    resultId: String(payload?.resultId ?? ""),
    outputMode: String(payload?.outputMode ?? "download"),
    historyEntry: normalizeHistoryEntry(payload?.historyEntry),
    artifactState: String(payload?.artifactState ?? "saved"),
    download: payload?.download
      ? {
          url: String(payload.download.url ?? ""),
          fileName: String(payload.download.fileName ?? ""),
        }
      : null,
    share: payload?.share
      ? {
          url: String(payload.share.url ?? ""),
          openUrl: String(payload.share.openUrl ?? ""),
        }
      : null,
    notes: Array.isArray(payload?.notes) ? payload.notes : [],
    lineage: payload?.lineage ?? null,
  };
}

export function normalizeJobStatus(payload) {
  return {
    jobId: String(payload?.jobId ?? ""),
    jobType: String(payload?.jobType ?? ""),
    status: String(payload?.status ?? "queued"),
    stageCode: String(payload?.stageCode ?? "queued"),
    progressPercent: Math.max(0, Math.min(100, asNumber(payload?.progressPercent))),
    submittedAt: String(payload?.submittedAt ?? ""),
    updatedAt: String(payload?.updatedAt ?? ""),
    message: String(payload?.message ?? ""),
    result: payload?.result ?? null,
    error: payload?.error ? String(payload.error) : "",
  };
}

function hasVideoDetails(details) {
  return Boolean(
    details.videoId ||
      details.description ||
      details.uploaderName ||
      details.channelName ||
      details.uploadDate ||
      details.releaseDate ||
      Number.isFinite(details.viewCount) ||
      Number.isFinite(details.likeCount) ||
      Number.isFinite(details.commentCount) ||
      details.categories.length ||
      details.tags.length,
  );
}
