import {
  API_TIMEOUTS,
  fetchJsonWithTimeout,
  waitForPollingJob,
} from "../client/http-client";
import { normalizeJobStatus } from "../contracts/normalizers";

export async function getJobStatus(jobId) {
  const payload = await fetchJsonWithTimeout(
    `/api/jobs/${jobId}`,
    {},
    API_TIMEOUTS.jobPoll,
  );
  return normalizeJobStatus(payload);
}

export async function waitForJobStatus(jobId, onProgress) {
  return waitForPollingJob(jobId, getJobStatus, onProgress);
}

export async function submitQueuedJob(
  path,
  options,
  onProgress,
  fallbackError,
) {
  const queuedJob = await fetchJsonWithTimeout(path, options, API_TIMEOUTS.queue);
  const finalJob = await waitForJobStatus(queuedJob.jobId, onProgress);

  if (finalJob.status === "failed") {
    throw new Error(finalJob.error || fallbackError);
  }

  return finalJob;
}
