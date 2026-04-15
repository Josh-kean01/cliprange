async function readJson(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.error || "The media pipeline returned an unexpected response.",
    );
  }

  return payload;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export const API_TIMEOUTS = {
  default: 10000,
  history: 8000,
  health: 8000,
  jobPoll: 10000,
  queue: 15000,
};

export function getErrorMessage(error, fallback) {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch") {
      return "The ClipRange server could not be reached. Check that it is running, then try again.";
    }

    if (error.name === "AbortError") {
      return "The server took too long to respond. Try again in a moment.";
    }

    return error.message || fallback;
  }

  return fallback;
}

export async function fetchJsonWithTimeout(
  url,
  options = {},
  timeoutMs = API_TIMEOUTS.default,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    return await readJson(response);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function waitForPollingJob(jobId, readStatus, onProgress) {
  let previousPayload = null;

  for (;;) {
    const payload = await readStatus(jobId);
    onProgress(payload);

    if (payload.status === "completed" || payload.status === "failed") {
      return payload;
    }

    await sleep(getNextPollDelay(payload, previousPayload));
    previousPayload = payload;
  }
}

function getNextPollDelay(payload, previousPayload) {
  if (payload.status === "queued") {
    return 250;
  }

  const progressChanged =
    !previousPayload ||
    payload.progressPercent !== previousPayload.progressPercent ||
    payload.updatedAt !== previousPayload.updatedAt;

  if (progressChanged) {
    return 300;
  }

  const updatedAt = Date.parse(payload.updatedAt || "");
  const stalledForMs = Number.isFinite(updatedAt) ? Date.now() - updatedAt : 0;

  if (stalledForMs > 5000) {
    return 1000;
  }

  return 750;
}
