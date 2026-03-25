async function readJson(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "The media pipeline returned an unexpected response.");
  }

  return payload;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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

export function triggerDownload(url, fileName) {
  const link = document.createElement("a");
  link.href = new URL(url, window.location.origin).toString();
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
}

export async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 5000) {
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

export async function waitForJob(jobId, onProgress) {
  for (;;) {
    const payload = await fetchJsonWithTimeout(`/api/jobs/${jobId}`, {}, 5000);

    onProgress(payload);

    if (payload.status === "completed" || payload.status === "failed") {
      return payload;
    }

    await sleep(450);
  }
}

export async function ensureBackendReady() {
  const payload = await fetchJsonWithTimeout("/api/health", {}, 3000);

  if (!payload.ok) {
    throw new Error("The ClipRange server is unavailable right now.");
  }

  if (Number(payload.apiVersion) < 3 || !payload.features?.jobs || !payload.features?.history) {
    throw new Error("The frontend and backend versions do not match. Restart or redeploy the latest build.");
  }

  return payload;
}
