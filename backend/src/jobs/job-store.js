import crypto from "node:crypto";

import { JOB_STALL_MS, JOB_TTL_MS } from "../config/runtime.js";
import { clampNumber } from "../utils/clip-utils.js";
import { createAppError, normalizeError } from "../utils/http.js";
import { readJobJournal, writeJobJournal } from "./job-repository.js";

const jobs = new Map();
let persistChain = Promise.resolve();

export function getJob(jobId) {
  return jobs.get(jobId) ?? null;
}

export async function hydrateJobStore() {
  const persistedJobs = await readJobJournal();
  jobs.clear();

  for (const persistedJob of persistedJobs) {
    const job = normalizePersistedJob(persistedJob);

    if (job) {
      jobs.set(job.id, job);
    }
  }

  const now = Date.now();
  let interruptedJobs = 0;

  for (const [jobId, job] of jobs.entries()) {
    if (["completed", "failed"].includes(job.status)) {
      continue;
    }

    jobs.set(
      jobId,
      buildFailedJob(job, {
        now,
        code: "SERVER_RESTARTED",
        stage: "Server restarted during processing.",
        userMessage:
          "The server restarted while this job was running. Start the request again.",
      }),
    );
    interruptedJobs += 1;
  }

  if (interruptedJobs > 0) {
    await persistJobs();
  }

  return {
    totalJobs: jobs.size,
    interruptedJobs,
  };
}

export function createJob(type, stage, progress, workspaceId) {
  const now = Date.now();
  const job = {
    id: crypto.randomUUID(),
    type,
    workspaceId,
    status: "queued",
    stage,
    progress: clampNumber(progress, 0, 100),
    createdAt: now,
    updatedAt: now,
    result: null,
    error: null,
    errorCode: "",
  };

  jobs.set(job.id, job);
  void persistJobs();
  return job;
}

export function updateJob(jobId, patch) {
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

  if (next.status === "completed" || next.status === "failed") {
    void persistJobs();
  }

  return next;
}

export async function cleanupJobs() {
  const now = Date.now();
  const cutoff = Date.now() - JOB_TTL_MS;
  const stalledCutoff = now - JOB_STALL_MS;
  let changed = false;

  for (const [jobId, job] of jobs.entries()) {
    if (!["completed", "failed"].includes(job.status) && job.updatedAt < stalledCutoff) {
      jobs.set(
        jobId,
        buildFailedJob(job, {
          now,
          code: "PROCESS_TIMEOUT",
          stage: "Job timed out while processing.",
          userMessage:
            "The media tools took too long to finish this job. Try again.",
        }),
      );
      changed = true;
      continue;
    }

    if (job.updatedAt < cutoff) {
      jobs.delete(jobId);
      changed = true;
    }
  }

  if (changed) {
    await persistJobs();
  }
}

export function listActiveJobs() {
  return [...jobs.values()].filter(
    (job) => !["completed", "failed"].includes(job.status),
  );
}

function normalizePersistedJob(persistedJob) {
  if (!persistedJob || typeof persistedJob !== "object") {
    return null;
  }

  const id = String(persistedJob.id ?? "").trim();
  const type = String(persistedJob.type ?? "").trim();
  const workspaceId = String(persistedJob.workspaceId ?? "").trim();

  if (!id || !type || !workspaceId) {
    return null;
  }

  const createdAt = Number(persistedJob.createdAt ?? Date.now());
  const updatedAt = Number(persistedJob.updatedAt ?? createdAt);

  return {
    id,
    type,
    workspaceId,
    status: String(persistedJob.status ?? "queued"),
    stage: String(persistedJob.stage ?? "Queued..."),
    progress: clampNumber(persistedJob.progress ?? 0, 0, 100),
    createdAt,
    updatedAt,
    result: persistedJob.result ?? null,
    error: persistedJob.error ? String(persistedJob.error) : null,
    errorCode: persistedJob.errorCode ? String(persistedJob.errorCode) : "",
  };
}

function buildFailedJob(job, { now, code, stage, userMessage }) {
  const failure = createAppError({
    statusCode: 500,
    code,
    stage,
    message: userMessage,
    userMessage,
    retryable: code !== "TOOL_MISSING",
  });

  return {
    ...job,
    status: "failed",
    stage,
    progress: 0,
    updatedAt: now,
    error: normalizeError(failure),
    errorCode: code,
  };
}

function snapshotJobs() {
  return [...jobs.values()].sort((left, right) => left.createdAt - right.createdAt);
}

function persistJobs() {
  persistChain = persistChain
    .catch(() => {})
    .then(() => writeJobJournal(snapshotJobs()));
  return persistChain;
}
