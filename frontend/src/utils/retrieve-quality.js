export const DEFAULT_RETRIEVE_QUALITY = "hd";

export const RETRIEVE_QUALITY_OPTIONS = Object.freeze([
  {
    key: "2k",
    label: "2K 1440p",
    maxResolution: 1440,
    description: "Sharpest local preview, but retrieval and export can be slower on some sources.",
  },
  {
    key: "hd",
    label: "HD 1080p",
    maxResolution: 1080,
    description: "Best balance of sharp quality, smaller downloads, and faster exports.",
  },
  {
    key: "best",
    label: "Best available",
    maxResolution: null,
    description: "Ask YouTube for the highest source it exposes, even when that exceeds 2K.",
  },
]);

const RETRIEVE_QUALITY_OPTION_MAP = new Map(
  RETRIEVE_QUALITY_OPTIONS.map((option) => [option.key, option]),
);

export function normalizeRetrieveQuality(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["2k", "qhd", "1440", "1440p"].includes(normalized)) {
    return "2k";
  }

  if (["hd", "fhd", "1080", "1080p"].includes(normalized)) {
    return "hd";
  }

  if (["best", "max", "highest"].includes(normalized)) {
    return "best";
  }

  return DEFAULT_RETRIEVE_QUALITY;
}

export function getRetrieveQualityOption(value) {
  return (
    RETRIEVE_QUALITY_OPTION_MAP.get(normalizeRetrieveQuality(value)) ||
    RETRIEVE_QUALITY_OPTION_MAP.get(DEFAULT_RETRIEVE_QUALITY)
  );
}

export function normalizeRequestedQuality(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const option = getRetrieveQualityOption(payload?.key);
  const maxResolution = Number.isFinite(Number(payload?.maxResolution))
    ? Number(payload.maxResolution)
    : option.maxResolution ?? null;

  return {
    key: option.key,
    label: String(payload?.label ?? "").trim() || option.label,
    maxResolution,
  };
}

export function normalizeRetrievedQuality(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = Number.isFinite(Number(payload?.value)) ? Number(payload.value) : null;
  const width = Number.isFinite(Number(payload?.width)) ? Number(payload.width) : null;
  const height = Number.isFinite(Number(payload?.height)) ? Number(payload.height) : null;
  const resolution = String(payload?.resolution ?? "").trim();
  const label =
    String(payload?.label ?? "").trim() ||
    (Number.isFinite(value) ? `${value}p` : resolution);

  if (!label && !resolution && !Number.isFinite(value) && !Number.isFinite(width) && !Number.isFinite(height)) {
    return null;
  }

  return {
    label: label || "Best available",
    value,
    width,
    height,
    resolution,
    formatId: String(payload?.formatId ?? "").trim(),
    formatNote: String(payload?.formatNote ?? "").trim(),
    isFallback: Boolean(payload?.isFallback),
  };
}

export function describeLoadedQuality(requestedQuality, retrievedQuality) {
  if (retrievedQuality?.label && requestedQuality?.label) {
    if (retrievedQuality.isFallback) {
      return `Requested ${requestedQuality.label}. Loaded the best available source at ${retrievedQuality.label}.`;
    }

    return `Requested ${requestedQuality.label}. Loaded ${retrievedQuality.label} locally for editing.`;
  }

  if (retrievedQuality?.label) {
    return `Loaded ${retrievedQuality.label} locally for editing.`;
  }

  if (requestedQuality?.label) {
    return `Requested ${requestedQuality.label} for this retrieve.`;
  }

  return "";
}
