import { API_TIMEOUTS, fetchJsonWithTimeout } from "../client/http-client";

const HEALTH_CACHE_TTL_MS = 15000;

let backendReadyPromise = null;
let backendReadyExpiresAt = 0;

export async function ensureBackendReady() {
  const now = Date.now();

  if (backendReadyPromise && now < backendReadyExpiresAt) {
    return backendReadyPromise;
  }

  backendReadyPromise = fetchJsonWithTimeout(
    "/api/health",
    {},
    API_TIMEOUTS.health,
  )
    .then((payload) => {
      if (!payload.ok) {
        throw new Error("The ClipRange server is unavailable right now.");
      }

      if (
        Number(payload.apiVersion) < 5 ||
        !payload.features?.jobs ||
        !payload.features?.history
      ) {
        throw new Error(
          "The frontend and backend versions do not match. Restart or redeploy the latest build.",
        );
      }

      backendReadyExpiresAt = Date.now() + HEALTH_CACHE_TTL_MS;
      return payload;
    })
    .catch((error) => {
      backendReadyPromise = null;
      backendReadyExpiresAt = 0;
      throw error;
    });

  return backendReadyPromise;
}
