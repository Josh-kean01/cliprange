import fs from "node:fs/promises";
import path from "node:path";

import { CACHE_TTL_MS, EXPORT_TTL_MS } from "../config/runtime.js";
import { fileExists } from "../utils/filesystem.js";
import { readHistoryEntries, writeHistoryEntries } from "./history-repository.js";
import { removeShareIndexEntry } from "./share-index-repository.js";
import {
  ensureStorageDirectories,
  getWorkspacePaths,
  listWorkspaceIds,
} from "./workspace-paths.js";

export { ensureStorageDirectories } from "./workspace-paths.js";

export async function cleanupStorage() {
  await ensureStorageDirectories();
  const workspaceIds = await listWorkspaceIds();

  for (const workspaceId of workspaceIds) {
    const workspacePaths = getWorkspacePaths(workspaceId);

    await Promise.all([
      pruneDirectory(workspacePaths.sessionsDir, CACHE_TTL_MS, true),
      pruneDirectory(workspacePaths.legacyCacheDir, CACHE_TTL_MS, true),
      pruneDirectory(workspacePaths.sourcesDir, CACHE_TTL_MS, true),
      pruneDirectory(workspacePaths.exportDir, EXPORT_TTL_MS, false),
    ]);
    await pruneHistory(workspaceId);
  }
}

async function pruneDirectory(targetDir, maxAgeMs, directoriesOnly) {
  const entries = await fs.readdir(targetDir, { withFileTypes: true }).catch(
    () => [],
  );
  const cutoff = Date.now() - maxAgeMs;

  for (const entry of entries) {
    if (directoriesOnly && !entry.isDirectory()) {
      continue;
    }

    if (!directoriesOnly && !entry.isFile()) {
      continue;
    }

    const entryPath = path.join(targetDir, entry.name);
    const stats = await fs.stat(entryPath).catch(() => null);

    if (!stats || stats.mtimeMs >= cutoff) {
      continue;
    }

    await fs.rm(entryPath, { recursive: true, force: true }).catch(() => {});
  }
}

async function pruneHistory(workspaceId) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const items = await readHistoryEntries(workspaceId);
  const cutoff = Date.now() - EXPORT_TTL_MS;
  const nextItems = [];

  for (const item of items) {
    const createdAt = Date.parse(item.createdAt ?? "");

    if (Number.isFinite(createdAt) && createdAt < cutoff) {
      if (item.kind === "share") {
        await removeShareIndexEntry(workspaceId, item.entryId).catch(() => {});
      }
      continue;
    }

    if (item.artifact.fileName) {
      const filePath = path.join(workspacePaths.exportDir, item.artifact.fileName);

      if (!(await fileExists(filePath))) {
        if (item.kind === "share") {
          await removeShareIndexEntry(workspaceId, item.entryId).catch(() => {});
        }
        continue;
      }
    }

    nextItems.push(item);
  }

  await writeHistoryEntries(workspaceId, nextItems);
}
