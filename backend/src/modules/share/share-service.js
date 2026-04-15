import { createHttpError } from "../../utils/http.js";
import { findHistoryEntry } from "../../storage/history-repository.js";
import { findSharedClipEntry } from "../../storage/share-index-repository.js";

export async function getSharedHistoryEntry(entryId) {
  const shareIndexEntry = await findSharedClipEntry(entryId);

  if (!shareIndexEntry) {
    throw createHttpError(404, "Shared clip not found.");
  }

  const item = await findHistoryEntry(shareIndexEntry.workspaceId, entryId);

  if (!item?.artifact.fileName) {
    throw createHttpError(404, "Shared clip not found.");
  }

  return { ...item, workspaceId: shareIndexEntry.workspaceId };
}
