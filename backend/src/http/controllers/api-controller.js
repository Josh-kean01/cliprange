import {
  API_VERSION,
  MAX_RETRIEVE_REQUESTS_PER_WINDOW,
  MAX_TRIM_REQUESTS_PER_WINDOW,
} from "../../config/runtime.js";
import { getContractArtifact } from "../../contracts/api-contracts.js";
import { assertJobCapacity } from "../../jobs/policies/capacity-policy.js";
import { assertRateLimit } from "../../jobs/policies/rate-limit-policy.js";
import { createJob, getJob } from "../../jobs/job-store.js";
import { runExportWorkflow } from "../../modules/export/export-workflow.js";
import { runIngestionWorkflow } from "../../modules/ingestion/ingestion-workflow.js";
import {
  clearLibraryHistory,
  deleteLibraryEntry,
  listLibraryHistory,
  reopenLibraryEntry,
} from "../../modules/library/library-service.js";
import { getKnownMediaTools } from "../../media/media-pipeline.js";
import { presentJobStatus } from "../../presenters/job-presenter.js";
import { readSessionRecord } from "../../storage/session-repository.js";
import {
  ensureStorageDirectories,
} from "../../storage/maintenance-service.js";
import { createAppError, normalizeError, statusCodeFor } from "../../utils/http.js";
import { parseRetrieveRequest } from "../../validation/retrieve-request.js";
import { parseTrimRequest } from "../../validation/trim-request.js";

export async function getHealth(request, response) {
  try {
    await ensureStorageDirectories();
    const tools = getKnownMediaTools();

    response.json({
      ok: true,
      apiVersion: API_VERSION,
      contractVersion: getContractArtifact().contractVersion,
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
  } catch (error) {
    respondWithJsonError(response, error);
  }
}

export function getJobStatus(request, response) {
  const job = getJob(request.params.jobId);

  if (!job || job.workspaceId !== request.workspaceId) {
    response.status(404).json({ error: "Job not found or expired." });
    return;
  }

  response.json(presentJobStatus(job));
}

export async function listHistory(request, response) {
  try {
    await ensureStorageDirectories();
    response.json({ items: await listLibraryHistory(request.workspaceId) });
  } catch (error) {
    respondWithJsonError(response, error);
  }
}

export async function clearHistory(request, response) {
  try {
    response.json(await clearLibraryHistory(request.workspaceId));
  } catch (error) {
    respondWithJsonError(response, error);
  }
}

export async function deleteHistoryItem(request, response) {
  try {
    response.json(
      await deleteLibraryEntry(request.workspaceId, request.params.entryId),
    );
  } catch (error) {
    respondWithJsonError(response, error);
  }
}

export async function reopenHistoryEntry(request, response) {
  try {
    await ensureStorageDirectories();
    response.json(
      await reopenLibraryEntry(request.workspaceId, request.params.entryId),
    );
  } catch (error) {
    respondWithJsonError(response, error);
  }
}

export async function createRetrieveJobHandler(request, response) {
  try {
    const payload = parseRetrieveRequest(request.body);

    await ensureStorageDirectories();

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
    void runIngestionWorkflow(job.id, request.workspaceId, payload);

    response.status(202).json({ jobId: job.id });
  } catch (error) {
    respondWithJsonError(response, error);
  }
}

export async function createTrimJobHandler(request, response) {
  try {
    const payload = parseTrimRequest(request.body);

    await ensureStorageDirectories();

    const sessionRecord = await readSessionRecord(
      request.workspaceId,
      payload.sessionId,
    );

    if (!sessionRecord) {
      respondWithJsonError(
        response,
        createAppError({
          statusCode: 400,
          code: "SESSION_EXPIRED",
          stage: "load-session",
          message: "The loaded clip expired. Retrieve it again before exporting.",
          userMessage:
            "The loaded clip expired. Retrieve it again before exporting.",
        }),
      );
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

    const job = createJob("export", "Queued export job...", 0, request.workspaceId);
    void runExportWorkflow(job.id, request.workspaceId, payload);

    response.status(202).json({ jobId: job.id });
  } catch (error) {
    respondWithJsonError(response, error);
  }
}

function respondWithJsonError(response, error) {
  response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
}
