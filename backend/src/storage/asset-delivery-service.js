import path from "node:path";

import { createHttpError } from "../utils/http.js";
import { fileExists } from "../utils/filesystem.js";
import { findHistoryEntryByFileName } from "./history-repository.js";
import { readSessionRecord, resolveSessionMediaPath } from "./session-repository.js";
import { getWorkspacePaths } from "./workspace-paths.js";

export async function sendPrivateSessionAsset(
  workspaceId,
  sessionId,
  fileName,
  response,
) {
  const sessionRecord = await readSessionRecord(workspaceId, sessionId);

  if (!sessionRecord) {
    throw createHttpError(404, "Session media not found.");
  }

  const filePath = await resolveSessionMediaPath(workspaceId, sessionId, fileName);

  if (!filePath || !(await fileExists(filePath))) {
    throw createHttpError(404, "Session media not found.");
  }

  response.setHeader("Cache-Control", "private, no-store");
  response.sendFile(filePath);
}

export async function sendPrivateExportAsset(workspaceId, fileName, response) {
  const item = await findHistoryEntryByFileName(workspaceId, fileName);

  if (!item?.artifact?.fileName) {
    throw createHttpError(404, "Export file not found.");
  }

  const workspacePaths = getWorkspacePaths(workspaceId);
  const filePath = path.join(workspacePaths.exportDir, item.artifact.fileName);

  if (!(await fileExists(filePath))) {
    throw createHttpError(404, "Export file not found.");
  }

  response.setHeader("Cache-Control", "private, no-store");
  response.sendFile(filePath);
}

export async function sendSharedExportAsset(response, sharedEntry) {
  const workspacePaths = getWorkspacePaths(sharedEntry.workspaceId);
  const filePath = path.join(workspacePaths.exportDir, sharedEntry.fileName);

  if (!(await fileExists(filePath))) {
    throw createHttpError(404, "Shared clip file not found.");
  }

  response.setHeader("Cache-Control", "public, max-age=300");
  response.sendFile(filePath);
}
