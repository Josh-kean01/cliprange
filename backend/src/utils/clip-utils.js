import path from "node:path";

import {
  ALLOWED_SOURCE_HOSTS,
  CLIPRANGE_WATERMARK,
  MAX_SOURCE_DURATION_SECONDS,
} from "../config/runtime.js";
import { createHttpError } from "./http.js";

export function normalizeOutputMode(value) {
  return ["share", "draft", "download"].includes(String(value))
    ? String(value)
    : "download";
}

export function normalizeSourceKind(value) {
  return String(value ?? "").trim().toLowerCase() === "short"
    ? "short"
    : "video";
}

export function normalizeTags(value) {
  return normalizeStringList(value, 12);
}

export function extractYouTubeId(input) {
  try {
    const url = new URL(String(input ?? "").trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const shortId = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(shortId) ? shortId : "";
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const watchedId = url.searchParams.get("v");

      if (watchedId && /^[\w-]{11}$/.test(watchedId)) {
        return watchedId;
      }

      const pathParts = url.pathname.split("/").filter(Boolean);

      if (
        ["embed", "shorts", "live"].includes(pathParts[0]) &&
        /^[\w-]{11}$/.test(pathParts[1] ?? "")
      ) {
        return pathParts[1];
      }
    }
  } catch {
    return "";
  }

  return "";
}

export function isYouTubeShortsUrl(input) {
  try {
    const url = new URL(String(input ?? "").trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (!(host === "youtube.com" || host.endsWith(".youtube.com"))) {
      return false;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    return pathParts[0] === "shorts" && /^[\w-]{11}$/.test(pathParts[1] ?? "");
  } catch {
    return false;
  }
}

export function detectSourceKind({ requestUrl = "", metadata = null } = {}) {
  const routeSignals = [
    requestUrl,
    metadata?.webpage_url,
    metadata?.original_url,
    metadata?.url,
  ];
  const basenameSignals = [
    metadata?.webpage_url_basename,
    metadata?.url_basename,
  ];

  if (routeSignals.some((value) => isYouTubeShortsUrl(value))) {
    return "short";
  }

  if (
    basenameSignals.some(
      (value) => String(value ?? "").trim().toLowerCase() === "shorts",
    )
  ) {
    return "short";
  }

  return "video";
}

export function resolveSourceUrl(requestUrl, metadata, sourceKind = "video") {
  const requestValue = String(requestUrl ?? "").trim();
  const metadataUrl = String(
    metadata?.webpage_url ?? metadata?.original_url ?? metadata?.url ?? "",
  ).trim();

  if (normalizeSourceKind(sourceKind) === "short") {
    if (isYouTubeShortsUrl(requestValue)) {
      return requestValue;
    }

    if (isYouTubeShortsUrl(metadataUrl)) {
      return metadataUrl;
    }
  }

  return metadataUrl || requestValue;
}

export function extractVideoDetails(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const tags = normalizeStringList(metadata.tags);
  const categories = normalizeStringList(metadata.categories);
  const details = {
    videoId: normalizeString(metadata.id),
    description: normalizeString(metadata.description),
    uploaderName: normalizeString(metadata.uploader),
    uploaderId: normalizeString(metadata.uploader_id),
    uploaderUrl: normalizeString(metadata.uploader_url),
    channelName: normalizeString(metadata.channel) || normalizeString(metadata.uploader),
    channelId: normalizeString(metadata.channel_id),
    channelUrl: normalizeString(metadata.channel_url),
    uploadDate: normalizeString(metadata.upload_date),
    releaseDate: normalizeString(metadata.release_date),
    viewCount: normalizeCount(metadata.view_count),
    likeCount: normalizeCount(metadata.like_count),
    commentCount: normalizeCount(metadata.comment_count),
    categories,
    tags,
  };

  return hasVideoDetails(details) ? details : null;
}

export function clampNumber(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

export function isAllowedSourceUrl(input) {
  try {
    const value = new URL(input);
    const host = value.hostname.replace(/^www\./, "").toLowerCase();

    if (!isHttpUrl(input)) {
      return false;
    }

    return (
      ALLOWED_SOURCE_HOSTS.includes(host) ||
      ALLOWED_SOURCE_HOSTS.some(
        (allowedHost) =>
          allowedHost !== "youtu.be" && host.endsWith(`.${allowedHost}`),
      )
    );
  } catch {
    return false;
  }
}

export function isHttpUrl(input) {
  try {
    const value = new URL(input);
    return value.protocol === "http:" || value.protocol === "https:";
  } catch {
    return false;
  }
}

export function assertSupportedSourceMetadata(metadata) {
  const sourceUrl = String(
    metadata?.webpage_url ?? metadata?.original_url ?? metadata?.url ?? "",
  ).trim();
  const liveStatus = String(metadata?.live_status ?? "").toLowerCase();

  if (sourceUrl && !isAllowedSourceUrl(sourceUrl)) {
    throw createHttpError(400, "Only YouTube links are supported.");
  }

  if (
    metadata?.is_live ||
    ["is_live", "is_upcoming", "post_live"].includes(liveStatus)
  ) {
    throw createHttpError(400, "Live streams are not supported.");
  }

  assertSourceDuration(metadata?.duration);
}

export function assertSourceDuration(duration) {
  if (!Number.isFinite(duration)) {
    return;
  }

  if (duration > MAX_SOURCE_DURATION_SECONDS) {
    throw createHttpError(
      400,
      `Source videos can be at most ${formatDuration(MAX_SOURCE_DURATION_SECONDS)} long.`,
    );
  }
}

export function formatMeta(metadata, duration, fallbackUrl) {
  const pieces = [];

  if (metadata.uploader) {
    pieces.push(metadata.uploader);
  }

  if (duration) {
    pieces.push(formatDuration(duration));
  }

  if (!pieces.length) {
    try {
      return new URL(metadata.webpage_url ?? fallbackUrl).hostname;
    } catch {
      return "Retrieved source";
    }
  }

  return pieces.join(" | ");
}

export function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function sanitizeFilePart(input) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "cliprange-export"
  );
}

export function assertSafePathSegment(value, label) {
  const nextValue = String(value ?? "").trim();

  if (!nextValue || !/^[A-Za-z0-9._-]+$/.test(nextValue)) {
    throw createHttpError(400, `Invalid ${label}.`);
  }

  return nextValue;
}

export function assertSafeFileName(value) {
  const fileName = String(value ?? "").trim();

  if (!fileName || path.basename(fileName) !== fileName) {
    throw createHttpError(400, "Invalid file path.");
  }

  return assertSafePathSegment(fileName, "file name");
}

export function simplifyYtDlpStage(line, fallback) {
  if (line.includes("Destination")) {
    return "Writing video file...";
  }

  if (line.includes("Merging formats")) {
    return "Merging video and audio...";
  }

  if (line.includes("[download]")) {
    return "Downloading source video...";
  }

  return fallback;
}

export function buildCommentTag(payload, options) {
  return [
    `mode=${payload.outputMode}`,
    `subtitles=${options.subtitlesApplied ? "burned" : "off"}`,
    `watermark=${options.watermarkApplied ? "cliprange" : "removed"}`,
  ].join(" | ");
}

export function escapeFilterPath(filePath) {
  return path
    .resolve(filePath)
    .replaceAll("\\", "/")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\'");
}

export function buildVideoFilter({ subtitlePath, includeWatermark }) {
  const filters = [];

  if (subtitlePath) {
    filters.push(
      `subtitles='${escapeFilterPath(subtitlePath)}':force_style='Fontsize=18,BorderStyle=3,OutlineColour=&H66000000,Shadow=0,MarginV=28'`,
    );
  }

  if (includeWatermark) {
    filters.push(
      `drawtext=text='${CLIPRANGE_WATERMARK}':fontcolor=white@0.72:fontsize=24:box=1:boxcolor=black@0.28:boxborderw=14:x=w-tw-32:y=h-th-24`,
    );
  }

  return filters.join(",");
}

function normalizeStringList(value, limit = Number.POSITIVE_INFINITY) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))]
    .slice(0, limit);
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeCount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
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
