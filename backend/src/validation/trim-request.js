import { MAX_CLIP_DURATION_SECONDS } from "../config/runtime.js";
import { formatDuration, normalizeOutputMode, normalizeTags } from "../utils/clip-utils.js";
import { createHttpError } from "../utils/http.js";

export function parseTrimRequest(body) {
  const sessionId = String(body?.sessionId ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const selection = {
    startSeconds: Number(body?.selection?.startSeconds ?? body?.start),
    endSeconds: Number(body?.selection?.endSeconds ?? body?.end),
  };
  const outputMode = normalizeOutputMode(body?.outputMode);
  const subtitlePolicy = {
    mode:
      String(body?.subtitlePolicy?.mode ?? "").trim().toLowerCase() === "auto" ||
      Boolean(body?.autoSubtitles)
        ? "auto"
        : "off",
  };
  const watermarkPolicy = {
    mode:
      String(body?.watermarkPolicy?.mode ?? "").trim().toLowerCase() === "remove" ||
      Boolean(body?.removeWatermark)
        ? "remove"
        : "keep",
  };
  const tags = normalizeTags(body?.tags);

  if (!sessionId) {
    throw createHttpError(400, "Load a source clip before exporting.");
  }

  if (
    !Number.isFinite(selection.startSeconds) ||
    !Number.isFinite(selection.endSeconds) ||
    selection.endSeconds <= selection.startSeconds
  ) {
    throw createHttpError(400, "Choose a valid start and end range.");
  }

  const clipDuration = selection.endSeconds - selection.startSeconds;

  if (clipDuration < 0.25) {
    throw createHttpError(
      400,
      "Clips must be at least a quarter second long.",
    );
  }

  if (clipDuration > MAX_CLIP_DURATION_SECONDS) {
    throw createHttpError(
      400,
      `Clips can be at most ${formatDuration(MAX_CLIP_DURATION_SECONDS)} long.`,
    );
  }

  return {
    sessionId,
    title,
    outputMode,
    selection,
    subtitlePolicy,
    watermarkPolicy,
    tags,
  };
}
