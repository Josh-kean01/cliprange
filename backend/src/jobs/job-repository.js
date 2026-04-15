import fs from "node:fs/promises";

import { jobJournalPath } from "../config/runtime.js";
import { ensureStorageDirectories } from "../storage/workspace-paths.js";

export async function readJobJournal() {
  await ensureStorageDirectories();
  const contents = await fs.readFile(jobJournalPath, "utf8").catch(() => "[]");
  try {
    const parsed = JSON.parse(contents || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeJobJournal(entries) {
  await ensureStorageDirectories();
  const tempPath = `${jobJournalPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(entries, null, 2));
  await fs.rm(jobJournalPath, { force: true }).catch(() => {});
  await fs.rename(tempPath, jobJournalPath);
}
