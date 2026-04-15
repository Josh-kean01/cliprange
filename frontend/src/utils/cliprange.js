export const OUTPUT_MODES = [
  { key: "share", title: "Share Clip Link", description: "Host a clip page and copy a direct link." },
  { key: "draft", title: "Create Highlight Draft", description: "Save the selection in your library for later." },
  { key: "download", title: "Download Clip", description: "Render an MP4 and download it locally." },
];

export const INITIAL_EDITOR = {
  duration: 0,
  start: 0,
  end: 0,
  head: 0,
  mode: "share",
  title: "",
  url: "",
  playing: false,
};

export const INITIAL_OUTPUT = {
  removeWatermark: true,
  autoSubtitles: false,
};

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

export function normalizeEditor(nextState) {
  if (!nextState.duration) {
    return {
      ...nextState,
      start: 0,
      end: 0,
      head: 0,
      playing: false,
    };
  }

  const start = clamp(nextState.start, 0, nextState.duration);
  const end = clamp(nextState.end, start, nextState.duration);
  const head = clamp(nextState.head, start, end);

  return {
    ...nextState,
    start,
    end,
    head,
  };
}

export function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatClipLength(totalSeconds) {
  return formatClock(totalSeconds);
}

export function formatPreviewClock(totalSeconds, duration) {
  return `${formatClock(totalSeconds).slice(3)} / ${formatClock(duration).slice(3)}`;
}

export function parseClock(value) {
  const parts = value.split(":").map((part) => Number.parseInt(part, 10));

  if (!parts.length || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
}

export function extractYouTubeId(input) {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const shortId = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(shortId) ? shortId : null;
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const watchedId = url.searchParams.get("v");
      if (watchedId && /^[\w-]{11}$/.test(watchedId)) {
        return watchedId;
      }

      const pathParts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(pathParts[0]) && /^[\w-]{11}$/.test(pathParts[1] ?? "")) {
        return pathParts[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function detectYouTubeSourceKind(input) {
  try {
    const url = new URL(String(input ?? "").trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (!(host === "youtube.com" || host.endsWith(".youtube.com"))) {
      return "video";
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    return pathParts[0] === "shorts" && /^[\w-]{11}$/.test(pathParts[1] ?? "")
      ? "short"
      : "video";
  } catch {
    return "video";
  }
}

export function getPercent(value, duration) {
  if (!duration) {
    return "0%";
  }

  return `${(value / duration) * 100}%`;
}

export function formatHistoryDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatHistoryMeta(entry) {
  const duration = entry?.selection?.durationSeconds ?? entry?.duration ?? 0;
  const start = entry?.selection?.startSeconds ?? entry?.start ?? 0;
  const end = entry?.selection?.endSeconds ?? entry?.end ?? 0;

  return [
    formatClipLength(duration),
    `${formatClock(start).slice(3)}-${formatClock(end).slice(3)}`,
    formatHistoryDate(entry.createdAt),
  ].join(" | ");
}
