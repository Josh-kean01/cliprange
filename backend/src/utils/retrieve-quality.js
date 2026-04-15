import { normalizeSourceKind } from "./clip-utils.js";

export const DEFAULT_RETRIEVE_QUALITY = "hd";

const RETRIEVE_QUALITY_PRESET_MAP = {
  hd: {
    key: "hd",
    label: "HD 1080p",
    maxResolution: 1080,
  },
  "2k": {
    key: "2k",
    label: "2K 1440p",
    maxResolution: 1440,
  },
  best: {
    key: "best",
    label: "Best available",
    maxResolution: null,
  },
};

export const RETRIEVE_QUALITY_PRESETS = Object.freeze(
  Object.values(RETRIEVE_QUALITY_PRESET_MAP),
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

export function getRetrieveQualityPreset(value) {
  return RETRIEVE_QUALITY_PRESET_MAP[normalizeRetrieveQuality(value)];
}

export function buildRetrieveDownloadProfile({
  requestedQuality,
  sourceKind = "video",
}) {
  const preset = getRetrieveQualityPreset(requestedQuality);
  const normalizedSourceKind = normalizeSourceKind(sourceKind);
  const dimensionField = normalizedSourceKind === "short" ? "width" : "height";
  const dimensionFilter = preset.maxResolution
    ? `[${dimensionField}<=${preset.maxResolution}]`
    : "";

  return {
    preset,
    formatSelector: [
      `bv*${dimensionFilter}[ext=mp4]+ba[ext=m4a]`,
      `bv*${dimensionFilter}+ba`,
      `b${dimensionFilter}[ext=mp4]`,
      `b${dimensionFilter}`,
      "bv*[ext=mp4]+ba[ext=m4a]",
      "bv*+ba",
      "b[ext=mp4]",
      "b",
    ].join("/"),
    formatSort: preset.maxResolution
      ? `res:${preset.maxResolution},+size,+br`
      : "res,+size,+br",
  };
}

export function buildRetrieveQualityMetadata(metadata, requestedQuality) {
  return {
    requested: buildRequestedQualityDescriptor(requestedQuality),
    actual: buildActualQualityDescriptor(metadata, requestedQuality),
  };
}

export function normalizeRetrieveQualityMetadata(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const requested = buildRequestedQualityDescriptor(value?.requested?.key);
  const actualValue = asOptionalNumber(value?.actual?.value);
  const actualWidth = asOptionalNumber(value?.actual?.width);
  const actualHeight = asOptionalNumber(value?.actual?.height);
  const actualResolution = String(value?.actual?.resolution ?? "").trim();
  const actualLabel =
    String(value?.actual?.label ?? "").trim() ||
    (Number.isFinite(actualValue) ? `${actualValue}p` : actualResolution);
  const actualFormatId = String(value?.actual?.formatId ?? "").trim();
  const actualFormatNote = String(value?.actual?.formatNote ?? "").trim();

  return {
    requested,
    actual:
      actualLabel || actualResolution || Number.isFinite(actualValue)
        ? {
            label: actualLabel || "Best available",
            value: actualValue,
            width: actualWidth,
            height: actualHeight,
            resolution: actualResolution,
            formatId: actualFormatId,
            formatNote: actualFormatNote,
            isFallback:
              value?.actual?.isFallback ??
              Boolean(
                requested.maxResolution &&
                  Number.isFinite(actualValue) &&
                  actualValue < requested.maxResolution,
              ),
          }
        : null,
  };
}

function buildRequestedQualityDescriptor(requestedQuality) {
  const preset = getRetrieveQualityPreset(requestedQuality);

  return {
    key: preset.key,
    label: preset.label,
    maxResolution: preset.maxResolution,
  };
}

function buildActualQualityDescriptor(metadata, requestedQuality) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const requested = buildRequestedQualityDescriptor(requestedQuality);
  const width = asOptionalNumber(metadata.width);
  const height = asOptionalNumber(metadata.height);
  const resolution = String(metadata.resolution ?? "").trim();
  const formatId = String(metadata.format_id ?? "").trim();
  const formatNote = String(metadata.format_note ?? "").trim();
  const value = resolveQualityValue({ width, height, resolution, formatNote });

  if (
    !resolution &&
    !formatId &&
    !formatNote &&
    !Number.isFinite(width) &&
    !Number.isFinite(height) &&
    !Number.isFinite(value)
  ) {
    return null;
  }

  return {
    label: Number.isFinite(value) ? `${value}p` : resolution || "Best available",
    value,
    width,
    height,
    resolution,
    formatId,
    formatNote,
    isFallback:
      Boolean(
        requested.maxResolution &&
          Number.isFinite(value) &&
          value < requested.maxResolution,
      ),
  };
}

function resolveQualityValue({ width, height, resolution, formatNote }) {
  for (const candidate of [formatNote, resolution]) {
    const parsed = parseResolutionLabel(candidate);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (Number.isFinite(width) && Number.isFinite(height)) {
    return Math.min(width, height);
  }

  return null;
}

function parseResolutionLabel(value) {
  const text = String(value ?? "").trim().toLowerCase();
  const directMatch = text.match(/(\d{3,4})p\b/);

  if (directMatch) {
    return Number.parseInt(directMatch[1], 10);
  }

  const dimensionMatch = text.match(/(\d{3,4})x(\d{3,4})/);

  if (dimensionMatch) {
    return Math.min(
      Number.parseInt(dimensionMatch[1], 10),
      Number.parseInt(dimensionMatch[2], 10),
    );
  }

  return null;
}

function asOptionalNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}
