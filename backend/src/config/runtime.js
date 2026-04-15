import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, "..", ".env");

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envFilePath);
  } catch {
    // `.env` is optional in development; defaults still apply.
  }
}

export const backendSrcDir = path.resolve(__dirname, "..");
export const backendRootDir = path.resolve(backendSrcDir, "..");
export const repoRootDir = path.resolve(backendRootDir, "..");

export const frontendDir = path.join(repoRootDir, "frontend");
export const frontendDistDir = path.join(frontendDir, "dist");
export const frontendIndexHtmlPath = path.join(frontendDistDir, "index.html");

export const port = Number.parseInt(process.env.PORT ?? "8787", 10);

export const storageDir = resolveStorageDir(process.env.DATA_DIR);
export const workspacesDir = path.join(storageDir, "workspaces");
export const tempDir = path.join(storageDir, "tmp");
export const jobJournalPath = path.join(tempDir, "jobs.json");

export const workspaceCookieName = "cliprange_workspace";
export const sessionCookieMaxAgeMs = 180 * 24 * 60 * 60 * 1000;
export const sessionSecret =
  process.env.SESSION_SECRET?.trim() ||
  crypto.randomBytes(32).toString("hex");
export const usingEphemeralSessionSecret = !process.env.SESSION_SECRET?.trim();

export const API_VERSION = 5;
export const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const JOB_TTL_MS = 30 * 60 * 1000;
export const JOB_STALL_MS = 20 * 60 * 1000;
export const MAX_HISTORY_ITEMS = 30;
export const CLIPRANGE_WATERMARK = "ClipRange";
export const MAX_CLIP_DURATION_SECONDS = 15 * 60;
export const MAX_SOURCE_DURATION_SECONDS = 2 * 60 * 60;
export const MAX_SOURCE_FILE_SIZE_MB = 512;
export const MAX_ACTIVE_JOBS_GLOBAL = 4;
export const MAX_ACTIVE_JOBS_PER_WORKSPACE = 2;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const MAX_RETRIEVE_REQUESTS_PER_WINDOW = 6;
export const MAX_TRIM_REQUESTS_PER_WINDOW = 12;
export const ALLOWED_SOURCE_HOSTS = ["youtube.com", "youtu.be"];
export const PROCESS_TIMEOUTS_MS = {
  toolProbe: 10 * 1000,
  metadata: 45 * 1000,
  subtitleFetch: 90 * 1000,
  probe: 15 * 1000,
  download: 12 * 60 * 1000,
  previewTranscode: 12 * 60 * 1000,
  filterValidation: 15 * 1000,
  exportRender: 20 * 60 * 1000,
};

export const MEDIA_TOOL_CANDIDATES = {
  ffmpeg: [
    process.env.FFMPEG_PATH,
    path.join(backendRootDir, "tools", "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(backendRootDir, "tools", "ffmpeg", "bin", "ffmpeg"),
    "ffmpeg",
  ],
  ffprobe: [
    process.env.FFPROBE_PATH,
    path.join(backendRootDir, "tools", "ffmpeg", "bin", "ffprobe.exe"),
    path.join(backendRootDir, "tools", "ffmpeg", "bin", "ffprobe"),
    "ffprobe",
  ],
  ytDlp: [
    process.env.YT_DLP_PATH,
    path.join(backendRootDir, "tools", "yt-dlp.exe"),
    path.join(backendRootDir, "tools", "yt-dlp"),
    "yt-dlp",
  ],
};

function resolveStorageDir(rawValue) {
  if (!rawValue) {
    return path.join(backendRootDir, "storage");
  }

  return path.isAbsolute(rawValue)
    ? rawValue
    : path.resolve(backendRootDir, rawValue);
}
