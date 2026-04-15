import { renderSharePage } from "../utils/share-page.js";

export function presentSharePage(entry) {
  return renderSharePage({
    ...entry,
    downloadUrl: `/share/${encodeURIComponent(entry.entryId)}/video`,
  });
}
