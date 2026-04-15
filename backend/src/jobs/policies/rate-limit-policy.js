import { RATE_LIMIT_WINDOW_MS } from "../../config/runtime.js";
import { createHttpError } from "../../utils/http.js";

const requestBuckets = new Map();

export function assertRateLimit(identity, scope, limit, message) {
  const now = Date.now();
  const bucketKey = `${identity}:${scope}`;
  const timestamps = requestBuckets.get(bucketKey) ?? [];
  const next = timestamps.filter(
    (timestamp) => timestamp >= now - RATE_LIMIT_WINDOW_MS,
  );

  if (next.length >= limit) {
    throw createHttpError(429, message, {
      code: "RATE_LIMITED",
      stage: "rate-limit",
      retryable: true,
    });
  }

  next.push(now);
  requestBuckets.set(bucketKey, next);
}

export function cleanupRateLimits() {
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
