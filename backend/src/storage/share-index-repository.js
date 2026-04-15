import fs from "node:fs/promises";

import { getWorkspacePaths, listWorkspaceIds } from "./workspace-paths.js";

const shareLookup = new Map();
let hydrated = false;

export async function hydrateShareLookup() {
  if (hydrated) {
    return;
  }

  const workspaceIds = await listWorkspaceIds();

  for (const workspaceId of workspaceIds) {
    const entries = await readShareIndex(workspaceId);

    for (const entry of entries) {
      shareLookup.set(entry.entryId, entry);
    }
  }

  hydrated = true;
}

export async function readShareIndex(workspaceId) {
  const workspacePaths = getWorkspacePaths(workspaceId);
  const contents = await fs.readFile(workspacePaths.shareIndexPath, "utf8").catch(
    () => "[]",
  );
  const parsed = JSON.parse(contents);
  const items = Array.isArray(parsed) ? parsed : [];

  return items
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      entryId: String(entry.entryId ?? "").trim(),
      workspaceId,
      fileName: String(entry.fileName ?? "").trim(),
      title: String(entry.title ?? "").trim(),
      thumbnailUrl: String(entry.thumbnailUrl ?? "").trim(),
      createdAt: String(entry.createdAt ?? ""),
    }))
    .filter((entry) => entry.entryId && entry.fileName);
}

export async function upsertShareIndexEntry(workspaceId, entry) {
  await hydrateShareLookup();

  const workspacePaths = getWorkspacePaths(workspaceId);
  const existing = await readShareIndex(workspaceId);
  const nextEntry = {
    entryId: entry.entryId,
    workspaceId,
    fileName: entry.artifact.fileName,
    title: entry.title,
    thumbnailUrl: entry.thumbnailUrl ?? "",
    createdAt: entry.createdAt,
  };
  const next = [nextEntry, ...existing.filter((item) => item.entryId !== nextEntry.entryId)];

  await fs.writeFile(workspacePaths.shareIndexPath, JSON.stringify(next, null, 2));
  shareLookup.set(nextEntry.entryId, nextEntry);
}

export async function removeShareIndexEntry(workspaceId, entryId) {
  await hydrateShareLookup();

  const workspacePaths = getWorkspacePaths(workspaceId);
  const next = (await readShareIndex(workspaceId)).filter(
    (item) => item.entryId !== entryId,
  );

  await fs.writeFile(workspacePaths.shareIndexPath, JSON.stringify(next, null, 2));
  shareLookup.delete(entryId);
}

export async function findSharedClipEntry(entryId) {
  await hydrateShareLookup();
  return shareLookup.get(String(entryId ?? "").trim()) ?? null;
}
