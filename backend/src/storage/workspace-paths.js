import fs from "node:fs/promises";
import path from "node:path";

import { tempDir, workspacesDir } from "../config/runtime.js";
import { assertSafePathSegment } from "../utils/clip-utils.js";
import { fileExists } from "../utils/filesystem.js";

export function getWorkspacePaths(workspaceId) {
  const safeWorkspaceId = assertSafePathSegment(workspaceId, "workspace");
  const rootDir = path.join(workspacesDir, safeWorkspaceId);

  return {
    rootDir,
    sourcesDir: path.join(rootDir, "sources"),
    sessionsDir: path.join(rootDir, "sessions"),
    exportDir: path.join(rootDir, "exports"),
    historyPath: path.join(rootDir, "history.json"),
    shareIndexPath: path.join(rootDir, "share-index.json"),
    legacyCacheDir: path.join(rootDir, "cache"),
  };
}

export async function ensureStorageDirectories() {
  await Promise.all([
    fs.mkdir(workspacesDir, { recursive: true }),
    fs.mkdir(tempDir, { recursive: true }),
  ]);
}

export async function ensureWorkspaceDirectories(workspaceId) {
  const workspacePaths = getWorkspacePaths(workspaceId);

  await Promise.all([
    fs.mkdir(workspacePaths.rootDir, { recursive: true }),
    fs.mkdir(workspacePaths.sourcesDir, { recursive: true }),
    fs.mkdir(workspacePaths.sessionsDir, { recursive: true }),
    fs.mkdir(workspacePaths.exportDir, { recursive: true }),
  ]);
}

export async function listWorkspaceIds() {
  const entries = await fs.readdir(workspacesDir, { withFileTypes: true }).catch(
    () => [],
  );

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export async function resolveSessionDirectory(workspaceId, sessionId) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const safeSessionId = assertSafePathSegment(sessionId, "session");
  const primaryPath = path.join(workspacePaths.sessionsDir, safeSessionId);

  if (await fileExists(primaryPath)) {
    return primaryPath;
  }

  const legacyPath = path.join(workspacePaths.legacyCacheDir, safeSessionId);
  return (await fileExists(legacyPath)) ? legacyPath : primaryPath;
}
