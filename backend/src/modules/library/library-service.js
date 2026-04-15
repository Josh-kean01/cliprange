import fs from "node:fs/promises";
import path from "node:path";

import { createHttpError } from "../../utils/http.js";
import { fileExists } from "../../utils/filesystem.js";
import { presentEditorSession } from "../../presenters/editor-session-presenter.js";
import { presentHistoryEntry } from "../../presenters/history-entry-presenter.js";
import {
  findHistoryEntry,
  readHistoryEntries,
  writeHistoryEntries,
} from "../../storage/history-repository.js";
import { removeShareIndexEntry } from "../../storage/share-index-repository.js";
import { readSourceRecord } from "../../storage/source-repository.js";
import { readSessionRecord } from "../../storage/session-repository.js";
import { getWorkspacePaths } from "../../storage/workspace-paths.js";
import {
  cloneSessionRecord,
  createSessionFromExportArtifact,
  createSessionFromSourceRecord,
} from "../sessions/session-service.js";

export async function listLibraryHistory(workspaceId) {
  const items = await readHistoryEntries(workspaceId);
  return items.map(presentHistoryEntry);
}

export async function clearLibraryHistory(workspaceId) {
  const items = await readHistoryEntries(workspaceId);

  for (const item of items) {
    await removeHistoryArtifact(workspaceId, item);
  }

  await writeHistoryEntries(workspaceId, []);
  return { ok: true };
}

export async function deleteLibraryEntry(workspaceId, entryId) {
  const items = await readHistoryEntries(workspaceId);
  const target = items.find((item) => item.entryId === entryId);

  if (!target) {
    throw createHttpError(404, "History item not found.");
  }

  await removeHistoryArtifact(workspaceId, target);
  await writeHistoryEntries(
    workspaceId,
    items.filter((item) => item.entryId !== entryId),
  );

  return { ok: true };
}

export async function reopenLibraryEntry(workspaceId, entryId) {
  const item = await findHistoryEntry(workspaceId, entryId);

  if (!item) {
    throw createHttpError(404, "History item not found.");
  }

  const existingSession =
    item.reopen.sessionId && (await readSessionRecord(workspaceId, item.reopen.sessionId));

  if (existingSession) {
    const sessionRecord = await cloneSessionRecord(workspaceId, existingSession, {
      title: item.title,
      selection: {
        startSeconds:
          item.kind === "draft" ? item.selection.startSeconds : 0,
        endSeconds:
          item.kind === "draft"
            ? item.selection.endSeconds
            : existingSession.durationSeconds,
        headSeconds:
          item.kind === "draft" ? item.selection.startSeconds : 0,
      },
      lineage: item.lineage,
    });

    return presentEditorSession(sessionRecord);
  }

  const sourceRecord =
    item.sourceRef.sourceId &&
    (await readSourceRecord(workspaceId, item.sourceRef.sourceId));

  if (sourceRecord) {
    const sessionRecord = await createSessionFromSourceRecord(
      workspaceId,
      sourceRecord,
      {
        title: item.title,
        selection: {
          startSeconds:
            item.kind === "draft" ? item.selection.startSeconds : 0,
          endSeconds:
            item.kind === "draft"
              ? item.selection.endSeconds
              : sourceRecord.durationSeconds,
          headSeconds:
            item.kind === "draft" ? item.selection.startSeconds : 0,
        },
        lineage: item.lineage,
        originType: item.sourceRef.originType,
      },
    );

    return presentEditorSession(sessionRecord);
  }

  if (item.artifact.fileName) {
    const sessionRecord = await createSessionFromExportArtifact(
      workspaceId,
      item,
      {
        title: item.title,
      },
    );

    return presentEditorSession(sessionRecord);
  }

  throw createHttpError(
    400,
    "This draft source expired from storage. Retrieve the source again to reopen it.",
  );
}

async function removeHistoryArtifact(workspaceId, item) {
  if (item.kind === "share") {
    await removeShareIndexEntry(workspaceId, item.entryId).catch(() => {});
  }

  if (!item.artifact.fileName) {
    return;
  }

  const workspacePaths = getWorkspacePaths(workspaceId);
  await fs
    .rm(path.join(workspacePaths.exportDir, item.artifact.fileName), {
      force: true,
    })
    .catch(() => {});
}
