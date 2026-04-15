import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  backendRootDir,
  MEDIA_TOOL_CANDIDATES,
  MAX_SOURCE_FILE_SIZE_MB,
  PROCESS_TIMEOUTS_MS,
  tempDir,
} from "../config/runtime.js";
import { clampNumber } from "../utils/clip-utils.js";
import { createAppError, createHttpError } from "../utils/http.js";
import { buildRetrieveDownloadProfile } from "../utils/retrieve-quality.js";
import { fileExists } from "../utils/filesystem.js";

const BROWSER_PLAYABLE_MIME_TYPES = new Map([
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".ogv", "video/ogg"],
]);

let mediaToolsPromise;
let mediaToolsSnapshot = {
  ytDlp: "",
  ffmpeg: "",
  ffprobe: "",
};

export async function getMediaTools() {
  mediaToolsPromise ??= resolveMediaTools().then((tools) => {
    mediaToolsSnapshot = tools;
    return tools;
  });
  return mediaToolsPromise;
}

export function getKnownMediaTools() {
  return mediaToolsSnapshot;
}

export async function assertToolsAvailable(stage = "media-tools") {
  const tools = await getMediaTools();

  if (!tools.ytDlp || !tools.ffmpeg || !tools.ffprobe) {
    throw createAppError({
      statusCode: 503,
      code: "TOOL_MISSING",
      stage,
      message:
        "yt-dlp, ffmpeg, and ffprobe must be installed before retrieving clips. Set YT_DLP_PATH, FFMPEG_PATH, and FFPROBE_PATH or add them to PATH.",
      userMessage:
        "The required media tools are unavailable right now. Install yt-dlp, ffmpeg, and ffprobe, then try again.",
      retryable: true,
    });
  }

  return tools;
}

export async function readRemoteMetadata(url) {
  const { ytDlp } = await assertToolsAvailable("retrieve-metadata");
  const { stdout } = await runCommand(
    ytDlp,
    [
      "--dump-single-json",
      "--skip-download",
      "--no-playlist",
      "--no-warnings",
      url,
    ],
    {
      stage: "retrieve-metadata",
      timeoutMs: PROCESS_TIMEOUTS_MS.metadata,
      retryable: true,
    },
  );

  return JSON.parse(stdout);
}

export async function downloadSourceVideo(
  url,
  sessionDir,
  options = {},
  onProgress,
) {
  const { ytDlp } = await assertToolsAvailable("download-source");
  await fs.mkdir(sessionDir, { recursive: true });
  const { formatSelector, formatSort } = buildRetrieveDownloadProfile({
    requestedQuality: options.requestedQuality,
    sourceKind: options.sourceKind,
  });

  const outputTemplate = path.join(sessionDir, "source.%(ext)s");
  await runCommand(
    ytDlp,
    [
      "--no-playlist",
      "--no-warnings",
      "--newline",
      "--concurrent-fragments",
      "4",
      "--restrict-filenames",
      "--write-info-json",
      "--max-filesize",
      `${MAX_SOURCE_FILE_SIZE_MB}M`,
      "--format",
      formatSelector,
      "--format-sort",
      formatSort,
      "--merge-output-format",
      "mp4",
      "--output",
      outputTemplate,
      url,
    ],
    {
      stage: "download-source",
      timeoutMs: PROCESS_TIMEOUTS_MS.download,
      retryable: true,
      onLine: (line) => {
        const match = line.match(/(\d+(?:\.\d+)?)%/);

        if (match && onProgress) {
          onProgress(Number.parseFloat(match[1]) / 100, line);
        }
      },
    },
  );

  const sourcePath = await resolveSourceFile(sessionDir);
  const stats = await fs.stat(sourcePath);

  if (stats.size > MAX_SOURCE_FILE_SIZE_MB * 1024 * 1024) {
    throw createHttpError(
      400,
      `Source files can be at most ${MAX_SOURCE_FILE_SIZE_MB} MB.`,
      {
        code: "SOURCE_TOO_LARGE",
        stage: "download-source",
      },
    );
  }

  return sourcePath;
}

export async function ensureSubtitleFile(sessionDir, sourceUrl) {
  const { ytDlp } = await assertToolsAvailable("fetch-subtitles");
  const existingSubtitle = await findSubtitleFile(sessionDir);

  if (existingSubtitle) {
    return existingSubtitle;
  }

  if (!sourceUrl) {
    return "";
  }

  const outputTemplate = path.join(sessionDir, "source.%(ext)s");
  await runCommand(
    ytDlp,
    [
      "--skip-download",
      "--no-playlist",
      "--no-warnings",
      "--write-auto-subs",
      "--write-subs",
      "--sub-langs",
      "en.*,en",
      "--sub-format",
      "vtt",
      "--convert-subs",
      "vtt",
      "--output",
      outputTemplate,
      sourceUrl,
    ],
    {
      stage: "fetch-subtitles",
      timeoutMs: PROCESS_TIMEOUTS_MS.subtitleFetch,
      retryable: true,
      allowFailure: true,
    },
  );

  return (await findSubtitleFile(sessionDir)) || "";
}

export async function resolveSourceFile(sessionDir) {
  const entries = await fs.readdir(sessionDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith("source."))
    .filter((name) => !name.endsWith(".part"))
    .filter((name) => !name.endsWith(".ytdl"))
    .filter((name) => !name.endsWith(".info.json"))
    .filter((name) => !name.endsWith(".vtt"))
    .filter((name) => !name.endsWith(".srt"));

  const preferredFile =
    files.find((name) => name.endsWith(".mp4")) ??
    files.find((name) => name.endsWith(".mkv")) ??
    files.find((name) => name.endsWith(".webm")) ??
    files[0];

  if (!preferredFile) {
    throw createAppError({
      statusCode: 500,
      code: "SOURCE_MISSING",
      stage: "resolve-source-file",
      message: "The source video was not downloaded successfully.",
      userMessage: "The source video was not downloaded successfully.",
    });
  }

  return path.join(sessionDir, preferredFile);
}

export async function readSessionMetadata(sessionDir) {
  const entries = await fs.readdir(sessionDir, { withFileTypes: true });
  const metadataFile = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .find((name) => name.endsWith(".info.json"));

  if (!metadataFile) {
    return {};
  }

  const metadataPath = path.join(sessionDir, metadataFile);
  const contents = await fs.readFile(metadataPath, "utf8");
  return JSON.parse(contents);
}

export async function findSubtitleFile(sessionDir) {
  const entries = await fs
    .readdir(sessionDir, { withFileTypes: true })
    .catch(() => []);
  const subtitleFile = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .find((name) => name.endsWith(".vtt") || name.endsWith(".srt"));

  return subtitleFile ? path.join(sessionDir, subtitleFile) : "";
}

export async function resolvePreviewPath(sessionDir, sourcePath) {
  const previewPath = path.join(sessionDir, "preview.mp4");

  if (await fileExists(previewPath)) {
    return previewPath;
  }

  return sourcePath;
}

export async function getPreviewAssetDescriptor(sourcePath, sessionDir, onProgress) {
  const directMimeType = getBrowserPlayableMimeType(sourcePath);

  if (directMimeType) {
    return {
      filePath: sourcePath,
      mimeType: directMimeType,
      reusedSource: true,
    };
  }

  const previewPath = await createBrowserPreview(sourcePath, sessionDir, onProgress);
  return {
    filePath: previewPath,
    mimeType: "video/mp4",
    reusedSource: false,
  };
}

export async function probeDuration(filePath) {
  const { ffprobe } = await assertToolsAvailable("probe-duration");
  const { stdout } = await runCommand(
    ffprobe,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    {
      stage: "probe-duration",
      timeoutMs: PROCESS_TIMEOUTS_MS.probe,
    },
  );

  return Number.parseFloat(stdout.trim()) || 0;
}

export async function probeMediaCompatibility(inputPath) {
  const { ffprobe } = await assertToolsAvailable("probe-compatibility");
  const { stdout } = await runCommand(
    ffprobe,
    [
      "-v",
      "error",
      "-show_entries",
      "format=format_name",
      "-show_entries",
      "stream=codec_type,codec_name",
      "-of",
      "json",
      inputPath,
    ],
    {
      stage: "probe-compatibility",
      timeoutMs: PROCESS_TIMEOUTS_MS.probe,
    },
  );

  const payload = JSON.parse(stdout);
  const streams = Array.isArray(payload?.streams) ? payload.streams : [];
  const formatNames = String(payload?.format?.format_name ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const videoStream = streams.find((stream) => stream?.codec_type === "video");
  const audioStream = streams.find((stream) => stream?.codec_type === "audio");
  const videoCodec = String(videoStream?.codec_name ?? "").toLowerCase();
  const audioCodec = String(audioStream?.codec_name ?? "").toLowerCase();

  return {
    formatNames,
    videoCodec,
    audioCodec,
    canFastTrim:
      formatNames.includes("mp4") &&
      videoCodec === "h264" &&
      (!audioCodec || audioCodec === "aac"),
  };
}

export async function buildExportPlan({
  inputPath,
  subtitlePath,
  includeWatermark,
}) {
  const hasFilters = Boolean(subtitlePath || includeWatermark);

  if (hasFilters) {
    return {
      mode: "encode",
      compatibility: null,
    };
  }

  const compatibility = await probeMediaCompatibility(inputPath);

  if (compatibility.canFastTrim) {
    return {
      mode: "copy",
      compatibility,
    };
  }

  return {
    mode: "encode",
    compatibility,
  };
}

export async function validateRenderFilter({
  inputPath,
  start,
  duration,
  filter,
}) {
  if (!filter) {
    return true;
  }

  const { ffmpeg } = await assertToolsAvailable("validate-render-filter");
  const sampleDuration = Math.max(0.25, Math.min(duration || 1, 1));

  try {
    await runCommand(
      ffmpeg,
      [
        "-y",
        "-i",
        inputPath,
        "-ss",
        start.toFixed(3),
        "-t",
        sampleDuration.toFixed(3),
        "-vf",
        filter,
        "-f",
        "null",
        "-",
      ],
      {
        stage: "validate-render-filter",
        timeoutMs: PROCESS_TIMEOUTS_MS.filterValidation,
        retryable: false,
      },
    );
    return true;
  } catch (error) {
    if (error?.code === "PROCESS_EXIT_FAILED") {
      return false;
    }

    throw error;
  }
}

export async function trimClipFastCopy({
  inputPath,
  outputPath,
  start,
  duration,
  title,
  comment,
  onProgress,
}) {
  const { ffmpeg } = await assertToolsAvailable("fast-copy-export");
  const args = [
    "-y",
    "-ss",
    start.toFixed(3),
    "-t",
    duration.toFixed(3),
    "-i",
    inputPath,
    "-metadata",
    `title=${title}`,
    "-metadata",
    `comment=${comment}`,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    "-avoid_negative_ts",
    "make_zero",
    "-progress",
    "pipe:2",
    "-nostats",
    outputPath,
  ];

  await runCommand(ffmpeg, args, {
    stage: "fast-copy-export",
    timeoutMs: PROCESS_TIMEOUTS_MS.exportRender,
    retryable: true,
    onLine: createProgressHandler(duration, onProgress),
  });
}

export async function renderClip({
  inputPath,
  outputPath,
  start,
  duration,
  title,
  comment,
  filter,
  videoPreset = "veryfast",
  crf = 23,
  onProgress,
  stage = "render-export",
  timeoutMs = PROCESS_TIMEOUTS_MS.exportRender,
}) {
  const { ffmpeg } = await assertToolsAvailable(stage);
  const args = [
    "-y",
    "-i",
    inputPath,
    "-ss",
    start.toFixed(3),
    "-t",
    duration.toFixed(3),
  ];

  if (filter) {
    args.push("-vf", filter);
  }

  args.push(
    "-metadata",
    `title=${title}`,
    "-metadata",
    `comment=${comment}`,
    "-c:v",
    "libx264",
    "-preset",
    videoPreset,
    "-crf",
    String(crf),
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    "-progress",
    "pipe:2",
    "-nostats",
    outputPath,
  );

  await runCommand(ffmpeg, args, {
    stage,
    timeoutMs,
    retryable: true,
    onLine: createProgressHandler(duration, onProgress),
  });
}

async function resolveMediaTools() {
  const [ytDlp, ffmpeg, ffprobe] = await Promise.all([
    resolveToolCommand(MEDIA_TOOL_CANDIDATES.ytDlp, ["--version"]),
    resolveToolCommand(MEDIA_TOOL_CANDIDATES.ffmpeg, ["-version"]),
    resolveToolCommand(MEDIA_TOOL_CANDIDATES.ffprobe, ["-version"]),
  ]);

  return {
    ytDlp,
    ffmpeg,
    ffprobe,
  };
}

async function resolveToolCommand(candidates, versionArgs) {
  for (const candidate of uniqueStrings(candidates)) {
    if (looksLikePath(candidate) && !(await fileExists(candidate))) {
      continue;
    }

    try {
      await runCommand(candidate, versionArgs, {
        stage: "tool-probe",
        timeoutMs: PROCESS_TIMEOUTS_MS.toolProbe,
      });
      return candidate;
    } catch {
      continue;
    }
  }

  return "";
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values.map((value) => String(value ?? "").trim()).filter(Boolean),
    ),
  ];
}

function looksLikePath(value) {
  return (
    path.isAbsolute(value) ||
    value.includes("/") ||
    value.includes("\\") ||
    value.startsWith(".")
  );
}

function getBrowserPlayableMimeType(filePath) {
  return BROWSER_PLAYABLE_MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "";
}

async function createBrowserPreview(sourcePath, sessionDir, onProgress) {
  const previewPath = path.join(sessionDir, "preview.mp4");
  const sourceDuration = await probeDuration(sourcePath);

  await renderClip({
    inputPath: sourcePath,
    outputPath: previewPath,
    start: 0,
    duration: sourceDuration,
    title: "ClipRange preview",
    comment: "Preview transcode",
    filter: "",
    onProgress,
    stage: "preview-transcode",
    timeoutMs: PROCESS_TIMEOUTS_MS.previewTranscode,
  });

  return previewPath;
}

function createProgressHandler(duration, onProgress) {
  return (line) => {
    const match = line.match(/^out_time=(\d+):(\d+):(\d+(?:\.\d+)?)$/);

    if (!match || !duration || !onProgress) {
      return;
    }

    const elapsed =
      Number.parseInt(match[1], 10) * 3600 +
      Number.parseInt(match[2], 10) * 60 +
      Number.parseFloat(match[3]);

    onProgress(clampNumber(elapsed / duration, 0, 0.999));
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: backendRootDir,
      env: {
        ...process.env,
        TEMP: tempDir,
        TMP: tempDir,
        TMPDIR: tempDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let finished = false;

    const flushBuffer = (buffer) => {
      const parts = buffer.split(/\r?\n/);
      const remainder = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();

        if (line) {
          options.onLine?.(line);
        }
      }

      return remainder;
    };

    const timeoutId = options.timeoutMs
      ? setTimeout(() => {
          if (finished) {
            return;
          }

          finished = true;
          terminateChildProcess(child);
          reject(
            createAppError({
              statusCode: 504,
              code: "PROCESS_TIMEOUT",
              stage: options.stage ?? "external-process",
              message: `${path.basename(command)} timed out after ${options.timeoutMs}ms.`,
              userMessage:
                "The media tools took too long to finish that step. Try again.",
              retryable: options.retryable ?? true,
            }),
          );
        }, options.timeoutMs)
      : null;

    const settle = (handler) => {
      if (finished) {
        return;
      }

      finished = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      handler();
    };

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      stdoutBuffer += text;
      stdoutBuffer = flushBuffer(stdoutBuffer);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      stderrBuffer += text;
      stderrBuffer = flushBuffer(stderrBuffer);
    });

    child.on("error", (error) => {
      settle(() => {
        reject(
          createAppError({
            statusCode: 503,
            code: "TOOL_MISSING",
            stage: options.stage ?? "external-process",
            message: error.message,
            userMessage:
              "The media pipeline is unavailable right now. Check the local tool install and try again.",
            retryable: true,
            cause: error,
          }),
        );
      });
    });

    child.on("close", (code) => {
      settle(() => {
        if (stdoutBuffer.trim()) {
          options.onLine?.(stdoutBuffer.trim());
        }

        if (stderrBuffer.trim()) {
          options.onLine?.(stderrBuffer.trim());
        }

        if (code === 0 || options.allowFailure) {
          resolve({ stdout, stderr, exitCode: code ?? 0 });
          return;
        }

        reject(
          createAppError({
            statusCode: 500,
            code: "PROCESS_EXIT_FAILED",
            stage: options.stage ?? "external-process",
            message:
              summarizeProcessOutput(stderr, stdout) ||
              `${path.basename(command)} exited with code ${code}.`,
            userMessage:
              "The media tools could not complete that request.",
            retryable: options.retryable ?? false,
          }),
        );
      });
    });
  });
}

function summarizeProcessOutput(stderr, stdout) {
  const text = stderr.trim() || stdout.trim();

  if (!text) {
    return "";
  }

  return text.slice(-1200);
}

function terminateChildProcess(child) {
  if (!child.pid) {
    return;
  }

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.unref();
    return;
  }

  child.kill("SIGKILL");
}
