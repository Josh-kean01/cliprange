import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const indexHtmlPath = path.join(distDir, "index.html");
const storageDir = resolveStorageDir(process.env.DATA_DIR);
const workspacesDir = path.join(storageDir, "workspaces");

const app = express();
const port = Number.parseInt(process.env.PORT ?? "8787", 10);

const tempDir = path.join(storageDir, "tmp");
const workspaceCookieName = "cliprange_workspace";
const sessionCookieMaxAgeMs = 180 * 24 * 60 * 60 * 1000;
const sessionSecret =
  process.env.SESSION_SECRET?.trim() ||
  crypto.randomBytes(32).toString("hex");
const usingEphemeralSessionSecret = !process.env.SESSION_SECRET?.trim();

const API_VERSION = 5;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const JOB_TTL_MS = 30 * 60 * 1000;
const MAX_HISTORY_ITEMS = 30;
const CLIPRANGE_WATERMARK = "ClipRange";
const MAX_CLIP_DURATION_SECONDS = 15 * 60;
const MAX_SOURCE_DURATION_SECONDS = 2 * 60 * 60;
const MAX_SOURCE_FILE_SIZE_MB = 512;
const MAX_ACTIVE_JOBS_GLOBAL = 4;
const MAX_ACTIVE_JOBS_PER_WORKSPACE = 2;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_RETRIEVE_REQUESTS_PER_WINDOW = 6;
const MAX_TRIM_REQUESTS_PER_WINDOW = 12;
const ALLOWED_SOURCE_HOSTS = [
  "youtube.com",
  "youtu.be",
];

const jobs = new Map();
const requestBuckets = new Map();
let hasBuiltClient = false;
let mediaToolsPromise;

app.set("trust proxy", 1);
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.static(distDir, { index: false, fallthrough: true }));
app.use("/api", ensureWorkspaceContext);

app.get("/share/:clipId", async (request, response) => {
  try {
    const item = await findSharedHistoryItem(request.params.clipId);

    if (!item || !item.downloadUrl) {
      response.status(404).type("html").send("<h1>Shared clip not found</h1>");
      return;
    }

    response.type("html").send(
      renderSharePage({
        ...item,
        downloadUrl: `/share/${encodeURIComponent(item.clipId)}/video`,
      }),
    );
  } catch (error) {
    response
      .status(statusCodeFor(error))
      .type("html")
      .send(`<h1>${escapeHtml(normalizeError(error))}</h1>`);
  }
});

app.get("/share/:clipId/video", async (request, response) => {
  try {
    const item = await findSharedHistoryItem(request.params.clipId);

    if (!item?.fileName) {
      response.status(404).type("html").send("<h1>Shared clip not found</h1>");
      return;
    }

    await sendSharedExportAsset(response, item);
  } catch (error) {
    response
      .status(statusCodeFor(error))
      .type("html")
      .send(`<h1>${escapeHtml(normalizeError(error))}</h1>`);
  }
});

app.get("/media/session/:sessionId/:fileName", ensureWorkspaceContext, async (request, response) => {
  try {
    await sendPrivateSessionAsset(
      request.workspaceId,
      request.params.sessionId,
      request.params.fileName,
      response,
    );
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
});

app.get("/media/export/:fileName", ensureWorkspaceContext, async (request, response) => {
  try {
    await sendPrivateExportAsset(
      request.workspaceId,
      request.params.fileName,
      response,
    );
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
});

app.get("/api/health", async (request, response) => {
  await ensureDirectories();
  await ensureWorkspaceDirectories(request.workspaceId);
  const tools = await getMediaTools();

  response.json({
    ok: true,
    apiVersion: API_VERSION,
    features: {
      jobs: true,
      history: true,
      share: true,
      reopen: true,
    },
    tools: {
      ytDlp: Boolean(tools.ytDlp),
      ffmpeg: Boolean(tools.ffmpeg),
      ffprobe: Boolean(tools.ffprobe),
    },
  });
});

app.get("/api/jobs/:jobId", (request, response) => {
  const job = jobs.get(request.params.jobId);

  if (!job || job.workspaceId !== request.workspaceId) {
    response.status(404).json({ error: "Job not found or expired." });
    return;
  }

  response.json(serializeJob(job));
});

app.get("/api/history", async (request, response) => {
  try {
    await ensureDirectories();
    await cleanupStorage();
    response.json({ items: await readHistory(request.workspaceId) });
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
});

app.delete("/api/history", async (request, response) => {
  try {
    const items = await readHistory(request.workspaceId);

    for (const item of items) {
      await removeHistoryArtifact(request.workspaceId, item);
    }

    await writeHistory(request.workspaceId, []);
    response.json({ ok: true });
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
});

app.delete("/api/history/:clipId", async (request, response) => {
  try {
    const items = await readHistory(request.workspaceId);
    const target = items.find((item) => item.clipId === request.params.clipId);

    if (!target) {
      response.status(404).json({ error: "History item not found." });
      return;
    }

    await removeHistoryArtifact(request.workspaceId, target);
    await writeHistory(
      request.workspaceId,
      items.filter((item) => item.clipId !== request.params.clipId),
    );
    response.json({ ok: true });
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
});

app.post("/api/history/:clipId/reopen", async (request, response) => {
  try {
    await ensureDirectories();
    await cleanupStorage();

    const item = await findHistoryItem(request.workspaceId, request.params.clipId);

    if (!item) {
      response.status(404).json({ error: "History item not found." });
      return;
    }

    response.json(await reopenHistoryItem(request.workspaceId, item));
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
});

app.post("/api/retrieve", async (request, response) => {
  const url = String(request.body?.url ?? "").trim();

  if (!url) {
    response.status(400).json({ error: "Paste a YouTube URL to continue." });
    return;
  }

  if (!isAllowedSourceUrl(url)) {
    response.status(400).json({ error: "Only YouTube links are supported." });
    return;
  }

  try {
    await ensureDirectories();
    await ensureWorkspaceDirectories(request.workspaceId);
    await cleanupStorage();
    await assertToolsAvailable();
    assertRateLimit(
      request.workspaceId,
      "retrieve",
      MAX_RETRIEVE_REQUESTS_PER_WINDOW,
      "Too many retrieve requests. Please wait a few minutes and try again.",
    );
    assertRateLimit(
      `ip:${request.ip ?? "unknown"}`,
      "retrieve",
      MAX_RETRIEVE_REQUESTS_PER_WINDOW * 2,
      "Too many retrieve requests. Please wait a few minutes and try again.",
    );
    assertJobCapacity(request.workspaceId);

    const job = createJob(
      "retrieve",
      "Queued retrieve job...",
      0,
      request.workspaceId,
    );
    void runRetrieveJob(job.id, request.workspaceId, url);
    response.status(202).json({ jobId: job.id });
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
});

app.post("/api/trim", async (request, response) => {
  const sessionId = String(request.body?.sessionId ?? "").trim();
  const title = String(request.body?.title ?? "").trim();
  const sourceTitle = String(request.body?.sourceTitle ?? "").trim();
  const sourceUrl = String(request.body?.sourceUrl ?? "").trim();
  const thumbnailUrl = String(request.body?.thumbnailUrl ?? "").trim();
  const start = Number(request.body?.start);
  const end = Number(request.body?.end);
  const outputMode = normalizeOutputMode(request.body?.outputMode);
  const removeWatermark = Boolean(request.body?.removeWatermark);
  const autoSubtitles = Boolean(request.body?.autoSubtitles);
  const tags = normalizeTags(request.body?.tags);

  if (!sessionId) {
    response.status(400).json({ error: "Load a source clip before exporting." });
    return;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    response.status(400).json({ error: "Choose a valid start and end range." });
    return;
  }

  if (end - start < 0.25) {
    response.status(400).json({ error: "Clips must be at least a quarter second long." });
    return;
  }

  if (end - start > MAX_CLIP_DURATION_SECONDS) {
    response
      .status(400)
      .json({ error: `Clips can be at most ${formatDuration(MAX_CLIP_DURATION_SECONDS)} long.` });
    return;
  }

  try {
    await ensureDirectories();
    await ensureWorkspaceDirectories(request.workspaceId);
    await cleanupStorage();
    await assertToolsAvailable();
    const workspacePaths = getWorkspacePaths(request.workspaceId);
    const sessionDir = path.join(
      workspacePaths.cacheDir,
      assertSafePathSegment(sessionId, "session"),
    );

    if (!(await fileExists(sessionDir))) {
      response.status(400).json({ error: "The loaded clip expired. Retrieve it again before exporting." });
      return;
    }

    assertRateLimit(
      request.workspaceId,
      "trim",
      MAX_TRIM_REQUESTS_PER_WINDOW,
      "Too many export requests. Please wait a few minutes and try again.",
    );
    assertRateLimit(
      `ip:${request.ip ?? "unknown"}`,
      "trim",
      MAX_TRIM_REQUESTS_PER_WINDOW * 2,
      "Too many export requests. Please wait a few minutes and try again.",
    );
    assertJobCapacity(request.workspaceId);

    const job = createJob(
      "render",
      "Queued export job...",
      0,
      request.workspaceId,
    );
    void runTrimJob(job.id, request.workspaceId, {
      sessionId,
      title,
      sourceTitle,
      sourceUrl,
      thumbnailUrl,
      start,
      end,
      outputMode,
      removeWatermark,
      autoSubtitles,
      tags,
    });
    response.status(202).json({ jobId: job.id });
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
});

app.get(/^(?!\/(?:api|media|share)(?:\/|$)).*/, (_request, response, next) => {
  if (!hasBuiltClient) {
    next();
    return;
  }

  response.sendFile(indexHtmlPath);
});

app.listen(port, async () => {
  hasBuiltClient = await fileExists(indexHtmlPath);
  await ensureDirectories();
  await cleanupStorage();
  void getMediaTools();
  cleanupJobs();
  setInterval(() => {
    cleanupJobs();
    void cleanupStorage();
  }, 10 * 60 * 1000).unref();
  console.log(`ClipRange server listening on port ${port}.`);

  if (usingEphemeralSessionSecret) {
    console.warn(
      "SESSION_SECRET is not set. Workspace sessions will reset after each restart.",
    );
  }

  if (!hasBuiltClient) {
    console.log("Frontend build not found. Run npm run build to serve the app from this server.");
  }
});

async function runRetrieveJob(jobId, workspaceId, url) {
  let sessionDir = "";

  try {
    updateJob(jobId, {
      status: "running",
      stage: "Checking local media tools...",
      progress: 6,
    });

    updateJob(jobId, {
      stage: "Checking source details...",
      progress: 9,
    });

    const remoteMetadata = await readRemoteMetadata(url);
    assertSupportedSourceMetadata(remoteMetadata);

    const sessionId = crypto.randomUUID();
    const workspacePaths = getWorkspacePaths(workspaceId);
    sessionDir = path.join(workspacePaths.cacheDir, sessionId);

    updateJob(jobId, {
      stage: "Downloading source video...",
      progress: 10,
    });

    const sourcePath = await downloadSourceVideo(url, sessionDir, (percent, line) => {
      updateJob(jobId, {
        stage: simplifyYtDlpStage(line, "Downloading source video..."),
        progress: clampNumber(10 + Math.round(percent * 0.62), 10, 72),
      });
    });
    const metadata = {
      ...remoteMetadata,
      ...(await readSessionMetadata(sessionDir)),
    };

    updateJob(jobId, {
      stage: "Checking subtitles...",
      progress: 78,
    });

    const subtitlePath = await ensureSubtitleFile(sessionDir, metadata.webpage_url ?? url).catch(() => "");

    updateJob(jobId, {
      stage: "Preparing editor preview...",
      progress: 86,
    });

    const previewPath = await getPreviewAssetPath(sourcePath, sessionDir, (progress) => {
      updateJob(jobId, {
        stage: "Preparing editor preview...",
        progress: clampNumber(86 + Math.round(progress * 0.12), 86, 98),
      });
    });
    const duration = metadata.duration ?? (await probeDuration(sourcePath));
    assertSourceDuration(duration);

    updateJob(jobId, {
      status: "completed",
      stage: "Clip ready in the editor.",
      progress: 100,
      result: buildSessionPayload({
        sessionId,
        title: metadata.title ?? "Retrieved clip",
        meta: formatMeta(metadata, duration, url),
        sourceUrl: metadata.webpage_url ?? url,
        thumbnailUrl: metadata.thumbnail ?? "",
        subtitlePath,
        assetPath: previewPath,
        duration,
        tags: normalizeTags(metadata.tags),
      }),
    });
  } catch (error) {
    if (sessionDir) {
      await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {});
    }

    updateJob(jobId, {
      status: "failed",
      stage: "Retrieve failed.",
      progress: 0,
      error: normalizeError(error),
    });
  }
}

async function runTrimJob(jobId, workspaceId, payload) {
  try {
    updateJob(jobId, {
      status: "running",
      stage: "Loading source clip...",
      progress: 8,
    });

    const workspacePaths = getWorkspacePaths(workspaceId);
    const sessionDir = path.join(workspacePaths.cacheDir, payload.sessionId);
    const sourcePath = await resolveSourceFile(sessionDir);
    const sessionMetadata = await readSessionMetadata(sessionDir);
    const clipDuration = payload.end - payload.start;
    const tags = normalizeTags(payload.tags);
    const sourceTitle =
      sessionMetadata.title || payload.sourceTitle || payload.title || "Retrieved clip";
    const sourceUrl = isAllowedSourceUrl(sessionMetadata.webpage_url ?? "")
      ? sessionMetadata.webpage_url
      : "";
    const thumbnailUrl = isHttpUrl(sessionMetadata.thumbnail ?? "")
      ? sessionMetadata.thumbnail
      : "";

    if (payload.outputMode === "draft") {
      updateJob(jobId, {
        stage: "Saving highlight draft...",
        progress: 84,
      });

      const draftEntry = {
        clipId: crypto.randomUUID(),
        kind: "draft",
        title: payload.title || sourceTitle,
        sourceTitle,
        createdAt: new Date().toISOString(),
        duration: clipDuration,
        start: payload.start,
        end: payload.end,
        sessionId: payload.sessionId,
        sourceUrl,
        thumbnailUrl,
        tags,
        outputMode: payload.outputMode,
        removeWatermark: payload.removeWatermark,
        autoSubtitles: payload.autoSubtitles,
        subtitlesApplied: false,
        watermarkApplied: false,
        shareUrl: "",
        downloadUrl: "",
        fileName: "",
        notes: ["Draft saved without rendering a new file."],
      };

      await appendHistory(workspaceId, draftEntry);

      updateJob(jobId, {
        status: "completed",
        stage: "Draft saved to your library.",
        progress: 100,
        result: draftEntry,
      });
      return;
    }

    let subtitlePath = "";
    if (payload.autoSubtitles) {
      updateJob(jobId, {
        stage: "Checking subtitle track...",
        progress: 20,
      });
      subtitlePath = await ensureSubtitleFile(sessionDir, sourceUrl).catch(() => "");
    }

    const clipId = crypto.randomUUID();
    const fileStem = sanitizeFilePart(payload.title || sourceTitle || "cliprange-export");
    const fileName = `${fileStem}-${clipId}.mp4`;
    const outputPath = path.join(workspacePaths.exportDir, fileName);
    const notes = [];
    let watermarkApplied = !payload.removeWatermark;
    let subtitlesApplied = false;

    updateJob(jobId, {
      stage: "Rendering clip with ffmpeg...",
      progress: 32,
    });

    const primaryFilter = buildVideoFilter({
      subtitlePath,
      includeWatermark: watermarkApplied,
    });

    try {
      subtitlesApplied = Boolean(subtitlePath);
      await renderClip({
        inputPath: sourcePath,
        outputPath,
        start: payload.start,
        duration: clipDuration,
        title: payload.title || sourceTitle,
        comment: buildCommentTag(payload, {
          tags,
          subtitlesApplied,
          watermarkApplied,
        }),
        filter: primaryFilter,
        onProgress: (percent) => {
          updateJob(jobId, {
            stage: "Rendering clip with ffmpeg...",
            progress: clampNumber(32 + Math.round(percent * 0.58), 32, 90),
          });
        },
      });
    } catch (error) {
      if (subtitlesApplied) {
        subtitlesApplied = false;
        notes.push("Auto subtitles were requested but the source could not provide a burn-in track.");

        await renderClip({
          inputPath: sourcePath,
          outputPath,
          start: payload.start,
          duration: clipDuration,
          title: payload.title || sourceTitle,
          comment: buildCommentTag(payload, {
            tags,
            subtitlesApplied,
            watermarkApplied,
          }),
          filter: buildVideoFilter({
            subtitlePath: "",
            includeWatermark: watermarkApplied,
          }),
          onProgress: (percent) => {
            updateJob(jobId, {
              stage: "Finishing export without subtitle burn-in...",
              progress: clampNumber(32 + Math.round(percent * 0.58), 32, 90),
            });
          },
        });
      } else {
        throw error;
      }
    }

    updateJob(jobId, {
      stage: payload.outputMode === "share" ? "Publishing share link..." : "Saving export history...",
      progress: 94,
    });

    const historyEntry = {
      clipId,
      kind: payload.outputMode === "share" ? "share" : "download",
      title: payload.title || sourceTitle,
      sourceTitle,
      createdAt: new Date().toISOString(),
      duration: clipDuration,
      start: payload.start,
      end: payload.end,
      sessionId: payload.sessionId,
      sourceUrl,
      thumbnailUrl,
      tags,
      outputMode: payload.outputMode,
      removeWatermark: payload.removeWatermark,
      autoSubtitles: payload.autoSubtitles,
      subtitlesApplied,
      watermarkApplied,
      shareUrl: payload.outputMode === "share" ? `/share/${clipId}` : "",
      downloadUrl: `/media/export/${encodeURIComponent(fileName)}`,
      fileName,
      notes,
    };

    await appendHistory(workspaceId, historyEntry);

    updateJob(jobId, {
      status: "completed",
      stage: payload.outputMode === "share" ? "Share link ready." : "Export ready to download.",
      progress: 100,
      result: historyEntry,
    });
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      stage: "Export failed.",
      progress: 0,
      error: normalizeError(error),
    });
  }
}

function createJob(type, stage, progress, workspaceId) {
  const job = {
    id: crypto.randomUUID(),
    type,
    workspaceId,
    status: "queued",
    stage,
    progress,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    result: null,
    error: null,
  };

  jobs.set(job.id, job);
  return job;
}

function updateJob(jobId, patch) {
  const current = jobs.get(jobId);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
    progress: clampNumber(patch.progress ?? current.progress, 0, 100),
    updatedAt: Date.now(),
  };

  jobs.set(jobId, next);
  return next;
}

function serializeJob(job) {
  return {
    jobId: job.id,
    type: job.type,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    result: job.result,
    error: job.error,
  };
}

function cleanupJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;

  for (const [jobId, job] of jobs.entries()) {
    if (job.updatedAt < cutoff) {
      jobs.delete(jobId);
    }
  }

  const rateCutoff = Date.now() - RATE_LIMIT_WINDOW_MS;

  for (const [bucketKey, timestamps] of requestBuckets.entries()) {
    const next = timestamps.filter((timestamp) => timestamp >= rateCutoff);

    if (next.length) {
      requestBuckets.set(bucketKey, next);
    } else {
      requestBuckets.delete(bucketKey);
    }
  }
}

function assertJobCapacity(workspaceId) {
  const activeJobs = [...jobs.values()].filter(
    (job) => !["completed", "failed"].includes(job.status),
  );
  const activeWorkspaceJobs = activeJobs.filter(
    (job) => job.workspaceId === workspaceId,
  );

  if (activeJobs.length >= MAX_ACTIVE_JOBS_GLOBAL) {
    throw createHttpError(
      429,
      "ClipRange is busy right now. Please wait for a running job to finish.",
    );
  }

  if (activeWorkspaceJobs.length >= MAX_ACTIVE_JOBS_PER_WORKSPACE) {
    throw createHttpError(
      429,
      "Finish or wait for your current job before starting another one.",
    );
  }
}

function assertRateLimit(workspaceId, scope, limit, message) {
  const now = Date.now();
  const bucketKey = `${workspaceId}:${scope}`;
  const timestamps = requestBuckets.get(bucketKey) ?? [];
  const next = timestamps.filter(
    (timestamp) => timestamp >= now - RATE_LIMIT_WINDOW_MS,
  );

  if (next.length >= limit) {
    throw createHttpError(429, message);
  }

  next.push(now);
  requestBuckets.set(bucketKey, next);
}

function normalizeOutputMode(value) {
  return ["share", "draft", "download"].includes(String(value)) ? String(value) : "download";
}

function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))].slice(0, 12);
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function isAllowedSourceUrl(input) {
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

function isHttpUrl(input) {
  try {
    const value = new URL(input);
    return value.protocol === "http:" || value.protocol === "https:";
  } catch {
    return false;
  }
}

function assertSupportedSourceMetadata(metadata) {
  const sourceUrl = String(
    metadata?.webpage_url ?? metadata?.original_url ?? metadata?.url ?? "",
  ).trim();
  const liveStatus = String(metadata?.live_status ?? "").toLowerCase();

  if (sourceUrl && !isAllowedSourceUrl(sourceUrl)) {
    throw createHttpError(400, "Only YouTube links are supported.");
  }

  if (metadata?.is_live || ["is_live", "is_upcoming", "post_live"].includes(liveStatus)) {
    throw createHttpError(400, "Live streams are not supported.");
  }

  assertSourceDuration(metadata?.duration);
}

function assertSourceDuration(duration) {
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

function formatMeta(metadata, duration, fallbackUrl) {
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

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function sanitizeFilePart(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "cliprange-export";
}

function assertSafePathSegment(value, label) {
  const nextValue = String(value ?? "").trim();

  if (!nextValue || !/^[A-Za-z0-9._-]+$/.test(nextValue)) {
    throw createHttpError(400, `Invalid ${label}.`);
  }

  return nextValue;
}

function assertSafeFileName(value) {
  const fileName = String(value ?? "").trim();

  if (!fileName || path.basename(fileName) !== fileName) {
    throw createHttpError(400, "Invalid file path.");
  }

  return assertSafePathSegment(fileName, "file name");
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function statusCodeFor(error) {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = Number(error.statusCode);

    if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
      return statusCode;
    }
  }

  return 500;
}

function normalizeError(error) {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (error instanceof Error && /yt-dlp|ffmpeg|ffprobe/i.test(error.message)) {
    return "The media tools could not complete that request.";
  }

  if (error instanceof Error && /ENOENT|EACCES|EPERM|spawn/i.test(error.message)) {
    return "The media pipeline is unavailable right now.";
  }

  return "The media pipeline hit an unexpected error.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function simplifyYtDlpStage(line, fallback) {
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

function buildCommentTag(payload, options) {
  return [
    `mode=${payload.outputMode}`,
    `subtitles=${options.subtitlesApplied ? "burned" : "off"}`,
    `watermark=${options.watermarkApplied ? "cliprange" : "removed"}`,
  ].join(" | ");
}

function escapeFilterPath(filePath) {
  return path.resolve(filePath).replaceAll("\\", "/").replaceAll(":", "\\:").replaceAll("'", "\\'");
}

function buildVideoFilter({ subtitlePath, includeWatermark }) {
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

async function ensureDirectories() {
  await Promise.all([
    fs.mkdir(workspacesDir, { recursive: true }),
    fs.mkdir(tempDir, { recursive: true }),
  ]);
}

async function ensureWorkspaceDirectories(workspaceId) {
  const workspacePaths = getWorkspacePaths(workspaceId);

  await Promise.all([
    fs.mkdir(workspacePaths.rootDir, { recursive: true }),
    fs.mkdir(workspacePaths.cacheDir, { recursive: true }),
    fs.mkdir(workspacePaths.exportDir, { recursive: true }),
  ]);
}

function getWorkspacePaths(workspaceId) {
  const safeWorkspaceId = assertSafePathSegment(workspaceId, "workspace");
  const rootWorkspaceDir = path.join(workspacesDir, safeWorkspaceId);

  return {
    rootDir: rootWorkspaceDir,
    cacheDir: path.join(rootWorkspaceDir, "cache"),
    exportDir: path.join(rootWorkspaceDir, "exports"),
    historyPath: path.join(rootWorkspaceDir, "history.json"),
  };
}

async function cleanupStorage() {
  const workspaceIds = await listWorkspaceIds();

  for (const workspaceId of workspaceIds) {
    const workspacePaths = getWorkspacePaths(workspaceId);

    await Promise.all([
      pruneDirectory(workspacePaths.cacheDir, CACHE_TTL_MS, true),
      pruneDirectory(workspacePaths.exportDir, EXPORT_TTL_MS, false),
    ]);
    await pruneHistory(workspaceId);
  }
}

async function pruneDirectory(targetDir, maxAgeMs, directoriesOnly) {
  const entries = await fs.readdir(targetDir, { withFileTypes: true }).catch(() => []);
  const cutoff = Date.now() - maxAgeMs;

  for (const entry of entries) {
    if (directoriesOnly && !entry.isDirectory()) {
      continue;
    }

    if (!directoriesOnly && !entry.isFile()) {
      continue;
    }

    const entryPath = path.join(targetDir, entry.name);
    const stats = await fs.stat(entryPath).catch(() => null);

    if (!stats || stats.mtimeMs >= cutoff) {
      continue;
    }

    await fs.rm(entryPath, { recursive: true, force: true }).catch(() => {});
  }
}

async function listWorkspaceIds() {
  const entries = await fs.readdir(workspacesDir, { withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

async function pruneHistory(workspaceId) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const items = await readHistory(workspaceId);
  const cutoff = Date.now() - EXPORT_TTL_MS;
  const pruned = [];

  for (const item of items) {
    const createdAt = Date.parse(item.createdAt ?? "");

    if (Number.isFinite(createdAt) && createdAt < cutoff) {
      continue;
    }

    if (item.fileName) {
      const filePath = path.join(workspacePaths.exportDir, item.fileName);

      if (!(await fileExists(filePath))) {
        continue;
      }
    }

    pruned.push(item);
  }

  await writeHistory(workspaceId, pruned.slice(0, MAX_HISTORY_ITEMS));
}

async function readHistory(workspaceId) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const contents = await fs
    .readFile(workspacePaths.historyPath, "utf8")
    .catch(() => "[]");
  const parsed = JSON.parse(contents);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeHistory(workspaceId, items) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  await ensureWorkspaceDirectories(workspaceId);
  await fs.writeFile(workspacePaths.historyPath, JSON.stringify(items, null, 2));
}

async function appendHistory(workspaceId, entry) {
  const items = await readHistory(workspaceId);
  const next = [entry, ...items.filter((item) => item.clipId !== entry.clipId)]
    .slice(0, MAX_HISTORY_ITEMS);
  await writeHistory(workspaceId, next);
}

async function findHistoryItem(workspaceId, clipId) {
  const safeClipId = assertSafePathSegment(clipId, "clip id");
  const items = await readHistory(workspaceId);
  return items.find((item) => item.clipId === safeClipId) ?? null;
}

async function findHistoryItemByFileName(workspaceId, fileName) {
  const safeFileName = assertSafeFileName(fileName);
  const items = await readHistory(workspaceId);
  return items.find((item) => item.fileName === safeFileName) ?? null;
}

async function findSharedHistoryItem(clipId) {
  const safeClipId = assertSafePathSegment(clipId, "clip id");

  for (const workspaceId of await listWorkspaceIds()) {
    const item = await findHistoryItem(workspaceId, safeClipId);

    if (item?.kind === "share" && item.fileName) {
      return { ...item, workspaceId };
    }
  }

  return null;
}

async function removeHistoryArtifact(workspaceId, item) {
  if (item.fileName) {
    const workspacePaths = getWorkspacePaths(workspaceId);
    await fs
      .rm(path.join(workspacePaths.exportDir, item.fileName), { force: true })
      .catch(() => {});
  }
}

function buildSessionPayload({
  sessionId,
  title,
  meta,
  sourceUrl,
  thumbnailUrl,
  subtitlePath,
  assetPath,
  duration,
  tags,
}) {
  return {
    sessionId,
    sourceUrl,
    assetUrl: `/media/session/${sessionId}/${encodeURIComponent(path.basename(assetPath))}`,
    thumbnailUrl,
    title,
    meta,
    duration: Math.max(1, Math.floor(duration || 0)),
    subtitleUrl: subtitlePath
      ? `/media/session/${sessionId}/${encodeURIComponent(path.basename(subtitlePath))}`
      : "",
    hasSubtitles: Boolean(subtitlePath),
    tags,
  };
}

async function reopenHistoryItem(workspaceId, item) {
  const workspacePaths = getWorkspacePaths(workspaceId);

  if (item.kind === "draft") {
    const sessionDir = path.join(workspacePaths.cacheDir, item.sessionId);

    if (!(await fileExists(sessionDir))) {
      throw new Error("This draft source expired from cache. Retrieve the source again to reopen it.");
    }

    const sourcePath = await resolveSourceFile(sessionDir);
    const previewPath = await resolvePreviewPath(sessionDir, sourcePath);
    const subtitlePath = await findSubtitleFile(sessionDir);
    const duration = await probeDuration(sourcePath);

    return buildSessionPayload({
      sessionId: item.sessionId,
      title: item.sourceTitle || item.title,
      meta: `${String(item.kind).toUpperCase()} | ${formatDuration(duration)}`,
      sourceUrl: item.sourceUrl || "",
      thumbnailUrl: item.thumbnailUrl || "",
      subtitlePath,
      assetPath: previewPath,
      duration,
      tags: normalizeTags(item.tags),
    });
  }

  if (!item.fileName) {
    throw new Error("This history item cannot be reopened.");
  }

  const exportPath = path.join(workspacePaths.exportDir, item.fileName);

  if (!(await fileExists(exportPath))) {
    throw new Error("The rendered clip is no longer available in exports.");
  }

  const sessionId = crypto.randomUUID();
  const sessionDir = path.join(workspacePaths.cacheDir, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  const sourcePath = path.join(sessionDir, "source.mp4");
  await fs.copyFile(exportPath, sourcePath);

  return buildSessionPayload({
    sessionId,
    title: item.title,
    meta: `${String(item.kind).toUpperCase()} | ${formatDuration(item.duration || 0)}`,
    sourceUrl: item.sourceUrl || "",
    thumbnailUrl: item.thumbnailUrl || "",
    subtitlePath: "",
    assetPath: sourcePath,
    duration: item.duration || (await probeDuration(sourcePath)),
    tags: normalizeTags(item.tags),
  });
}

function parseCookies(cookieHeader) {
  return String(cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function signWorkspaceId(workspaceId) {
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(workspaceId)
    .digest("base64url");
}

function serializeCookie(name, value, options = {}) {
  const pieces = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge) {
    pieces.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }

  if (options.path) {
    pieces.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    pieces.push("HttpOnly");
  }

  if (options.sameSite) {
    pieces.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    pieces.push("Secure");
  }

  return pieces.join("; ");
}

function readWorkspaceIdFromCookie(cookieHeader) {
  const rawCookie = parseCookies(cookieHeader)[workspaceCookieName];

  if (!rawCookie) {
    return "";
  }

  const [workspaceId, signature] = rawCookie.split(".");

  if (!workspaceId || !signature) {
    return "";
  }

  const expectedSignature = signWorkspaceId(workspaceId);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return "";
  }

  return workspaceId;
}

function createWorkspaceCookie(workspaceId) {
  return serializeCookie(
    workspaceCookieName,
    `${workspaceId}.${signWorkspaceId(workspaceId)}`,
    {
      maxAge: sessionCookieMaxAgeMs,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

async function ensureWorkspaceContext(request, response, next) {
  try {
    let workspaceId = readWorkspaceIdFromCookie(request.headers.cookie);

    if (!workspaceId) {
      workspaceId = crypto.randomUUID();
      response.append("Set-Cookie", createWorkspaceCookie(workspaceId));
    }

    request.workspaceId = workspaceId;
    await ensureWorkspaceDirectories(workspaceId);
    next();
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
}

async function sendPrivateSessionAsset(
  workspaceId,
  sessionId,
  fileName,
  response,
) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const safeSessionId = assertSafePathSegment(sessionId, "session");
  const safeFileName = assertSafeFileName(fileName);
  const filePath = path.join(workspacePaths.cacheDir, safeSessionId, safeFileName);

  if (!(await fileExists(filePath))) {
    throw createHttpError(404, "Session media not found.");
  }

  response.setHeader("Cache-Control", "private, no-store");
  response.sendFile(filePath);
}

async function sendPrivateExportAsset(workspaceId, fileName, response) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const safeFileName = assertSafeFileName(fileName);
  const item = await findHistoryItemByFileName(workspaceId, safeFileName);

  if (!item?.fileName) {
    throw createHttpError(404, "Export file not found.");
  }

  const filePath = path.join(workspacePaths.exportDir, item.fileName);

  if (!(await fileExists(filePath))) {
    throw createHttpError(404, "Export file not found.");
  }

  response.setHeader("Cache-Control", "private, no-store");
  response.sendFile(filePath);
}

async function sendSharedExportAsset(response, sharedItem) {
  const workspacePaths = getWorkspacePaths(sharedItem.workspaceId);
  const filePath = path.join(workspacePaths.exportDir, sharedItem.fileName);

  if (!(await fileExists(filePath))) {
    throw createHttpError(404, "Shared clip file not found.");
  }

  response.setHeader("Cache-Control", "public, max-age=300");
  response.sendFile(filePath);
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function resolveStorageDir(rawValue) {
  if (!rawValue) {
    return __dirname;
  }

  return path.isAbsolute(rawValue)
    ? rawValue
    : path.resolve(rootDir, rawValue);
}

async function getMediaTools() {
  mediaToolsPromise ??= resolveMediaTools();
  return mediaToolsPromise;
}

async function resolveMediaTools() {
  return {
    ytDlp: await resolveToolCommand(
      [
        process.env.YT_DLP_PATH,
        path.join(rootDir, "tools", "yt-dlp.exe"),
        path.join(rootDir, "tools", "yt-dlp"),
        "yt-dlp",
      ],
      ["--version"],
    ),
    ffmpeg: await resolveToolCommand(
      [
        process.env.FFMPEG_PATH,
        path.join(rootDir, "tools", "ffmpeg", "bin", "ffmpeg.exe"),
        path.join(rootDir, "tools", "ffmpeg", "bin", "ffmpeg"),
        "ffmpeg",
      ],
      ["-version"],
    ),
    ffprobe: await resolveToolCommand(
      [
        process.env.FFPROBE_PATH,
        path.join(rootDir, "tools", "ffmpeg", "bin", "ffprobe.exe"),
        path.join(rootDir, "tools", "ffmpeg", "bin", "ffprobe"),
        "ffprobe",
      ],
      ["-version"],
    ),
  };
}

async function resolveToolCommand(candidates, versionArgs) {
  for (const candidate of uniqueStrings(candidates)) {
    if (looksLikePath(candidate) && !(await fileExists(candidate))) {
      continue;
    }

    try {
      await runCommand(candidate, versionArgs, { allowFailure: true });
      return candidate;
    } catch {
      continue;
    }
  }

  return "";
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function looksLikePath(value) {
  return (
    path.isAbsolute(value) ||
    value.includes("/") ||
    value.includes("\\") ||
    value.startsWith(".")
  );
}

async function assertToolsAvailable() {
  const tools = await getMediaTools();

  if (!tools.ytDlp || !tools.ffmpeg || !tools.ffprobe) {
    throw new Error(
      "yt-dlp, ffmpeg, and ffprobe must be installed before retrieving clips. Set YT_DLP_PATH, FFMPEG_PATH, and FFPROBE_PATH or add them to PATH.",
    );
  }

  return tools;
}

async function readRemoteMetadata(url) {
  const { ytDlp } = await assertToolsAvailable();
  const { stdout } = await runCommand(ytDlp, [
    "--dump-single-json",
    "--skip-download",
    "--no-playlist",
    "--no-warnings",
    url,
  ]);

  return JSON.parse(stdout);
}

async function downloadSourceVideo(url, sessionDir, onProgress) {
  const { ytDlp } = await assertToolsAvailable();
  await fs.mkdir(sessionDir, { recursive: true });

  const outputTemplate = path.join(sessionDir, "source.%(ext)s");
  await runCommand(ytDlp, [
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
    "b[height<=1080][ext=mp4]/b[ext=mp4]/bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[ext=mp4]+ba[ext=m4a]/b[height<=1080]/b",
    "--format-sort",
    "res:1080,+size,+br",
    "--merge-output-format",
    "mp4",
    "--output",
    outputTemplate,
    url,
  ], {
    onLine: (line) => {
      const match = line.match(/(\d+(?:\.\d+)?)%/);
      if (match && onProgress) {
        onProgress(Number.parseFloat(match[1]) / 100, line);
      }
    },
  });

  const sourcePath = await resolveSourceFile(sessionDir);
  const stats = await fs.stat(sourcePath);

  if (stats.size > MAX_SOURCE_FILE_SIZE_MB * 1024 * 1024) {
    throw createHttpError(
      400,
      `Source files can be at most ${MAX_SOURCE_FILE_SIZE_MB} MB.`,
    );
  }

  return sourcePath;
}

async function ensureSubtitleFile(sessionDir, sourceUrl) {
  const { ytDlp } = await assertToolsAvailable();
  const existingSubtitle = await findSubtitleFile(sessionDir);

  if (existingSubtitle) {
    return existingSubtitle;
  }

  if (!sourceUrl) {
    return "";
  }

  const outputTemplate = path.join(sessionDir, "source.%(ext)s");
  await runCommand(ytDlp, [
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
  ], {
    allowFailure: true,
  });

  return (await findSubtitleFile(sessionDir)) || "";
}

async function resolveSourceFile(sessionDir) {
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
    throw new Error("The source video was not downloaded successfully.");
  }

  return path.join(sessionDir, preferredFile);
}

async function readSessionMetadata(sessionDir) {
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

async function findSubtitleFile(sessionDir) {
  const entries = await fs.readdir(sessionDir, { withFileTypes: true }).catch(() => []);
  const subtitleFile = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .find((name) => name.endsWith(".vtt") || name.endsWith(".srt"));

  return subtitleFile ? path.join(sessionDir, subtitleFile) : "";
}

async function resolvePreviewPath(sessionDir, sourcePath) {
  const previewPath = path.join(sessionDir, "preview.mp4");

  if (await fileExists(previewPath)) {
    return previewPath;
  }

  return sourcePath;
}

async function getPreviewAssetPath(sourcePath, sessionDir, onProgress) {
  if (path.extname(sourcePath).toLowerCase() === ".mp4") {
    return sourcePath;
  }

  return createBrowserPreview(sourcePath, sessionDir, onProgress);
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
  });

  return previewPath;
}

async function probeDuration(filePath) {
  const { ffprobe } = await assertToolsAvailable();
  const { stdout } = await runCommand(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  return Number.parseFloat(stdout.trim()) || 0;
}

async function renderClip({
  inputPath,
  outputPath,
  start,
  duration,
  title,
  comment,
  filter,
  onProgress,
}) {
  const { ffmpeg } = await assertToolsAvailable();
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
    "veryfast",
    "-crf",
    "23",
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
    onLine: (line) => {
      const match = line.match(/^out_time=(\d+):(\d+):(\d+(?:\.\d+)?)$/);

      if (!match || !duration || !onProgress) {
        return;
      }

      const elapsed =
        Number.parseInt(match[1], 10) * 3600 +
        Number.parseInt(match[2], 10) * 60 +
        Number.parseFloat(match[3]);

      onProgress(clampNumber(elapsed / duration, 0, 0.999));
    },
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
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
      reject(error);
    });

    child.on("close", (code) => {
      if (stdoutBuffer.trim()) {
        options.onLine?.(stdoutBuffer.trim());
      }

      if (stderrBuffer.trim()) {
        options.onLine?.(stderrBuffer.trim());
      }

      if (code === 0 || options.allowFailure) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          stderr.trim() ||
            stdout.trim() ||
            `${path.basename(command)} exited with code ${code}.`,
        ),
      );
    });
  });
}

function renderSharePage(item) {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const notes = Array.isArray(item.notes) ? item.notes : [];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(item.title)} | ClipRange Share</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(circle at top, rgba(91, 88, 255, 0.28), transparent 28%), #0f1020;
        color: #f4f5ff;
        display: grid;
        place-items: center;
        padding: 32px 16px;
      }
      .share-card {
        width: min(920px, 100%);
        background: rgba(17, 19, 38, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 28px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
        overflow: hidden;
      }
      .share-header {
        padding: 24px 28px 12px;
      }
      .share-header h1 {
        margin: 0 0 8px;
        font-size: clamp(28px, 4vw, 42px);
      }
      .meta {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
      }
      video {
        width: 100%;
        display: block;
        aspect-ratio: 16 / 9;
        background: black;
      }
      .share-body {
        display: grid;
        gap: 16px;
        padding: 20px 28px 30px;
      }
      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.86);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .actions a {
        text-decoration: none;
        color: white;
        background: linear-gradient(135deg, #4b46e5, #625dff);
        padding: 12px 18px;
        border-radius: 999px;
        font-weight: 700;
      }
      .notes {
        color: rgba(255, 255, 255, 0.74);
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <article class="share-card">
      <header class="share-header">
        <div class="meta">Shared from ClipRange</div>
        <h1>${escapeHtml(item.title)}</h1>
        <div class="meta">${escapeHtml(item.sourceTitle || "Clip export")} | ${escapeHtml(formatDuration(item.duration))}</div>
      </header>
      <video controls playsinline poster="${escapeHtml(item.thumbnailUrl || "")}" src="${escapeHtml(item.downloadUrl)}"></video>
      <div class="share-body">
        <div class="chip-row">
          <span class="chip">${escapeHtml(item.outputMode || item.kind || "clip")}</span>
          <span class="chip">${escapeHtml(item.subtitlesApplied ? "Subtitles burned" : "No subtitles burned")}</span>
          <span class="chip">${escapeHtml(item.watermarkApplied ? "ClipRange watermark" : "No watermark")}</span>
          ${tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="actions">
          <a href="${escapeHtml(item.downloadUrl)}" download="${escapeHtml(item.fileName || "cliprange-share.mp4")}">Download Clip</a>
        </div>
        ${notes.length ? `<div class="notes">${notes.map((note) => escapeHtml(note)).join("<br />")}</div>` : ""}
      </div>
    </article>
  </body>
</html>`;
}
