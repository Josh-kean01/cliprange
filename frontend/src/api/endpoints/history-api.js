import { API_TIMEOUTS, fetchJsonWithTimeout } from "../client/http-client";
import {
  normalizeEditorSession,
  normalizeHistoryEntry,
} from "../contracts/normalizers";
import { ensureBackendReady } from "./health-api";

export async function listHistoryEntries() {
  const payload = await fetchJsonWithTimeout(
    "/api/history",
    {},
    API_TIMEOUTS.history,
  );

  return Array.isArray(payload.items)
    ? payload.items.map(normalizeHistoryEntry)
    : [];
}

export async function clearHistoryEntries() {
  await ensureBackendReady();
  return fetchJsonWithTimeout(
    "/api/history",
    { method: "DELETE" },
    API_TIMEOUTS.history,
  );
}

export async function deleteHistoryEntry(entryId) {
  await ensureBackendReady();
  return fetchJsonWithTimeout(
    `/api/history/${entryId}`,
    { method: "DELETE" },
    API_TIMEOUTS.history,
  );
}

export async function reopenHistoryEntry(entryId) {
  await ensureBackendReady();
  const payload = await fetchJsonWithTimeout(
    `/api/history/${entryId}/reopen`,
    { method: "POST" },
    API_TIMEOUTS.queue,
  );

  return normalizeEditorSession(payload);
}
