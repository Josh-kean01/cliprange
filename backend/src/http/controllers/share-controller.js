import { getSharedHistoryEntry } from "../../modules/share/share-service.js";
import { presentSharePage } from "../../presenters/share-page-presenter.js";
import { sendSharedExportAsset } from "../../storage/asset-delivery-service.js";
import { escapeHtml, normalizeError, statusCodeFor } from "../../utils/http.js";

export async function getSharedClipPage(request, response) {
  try {
    const item = await getSharedHistoryEntry(request.params.clipId);

    response.type("html").send(
      presentSharePage({
        ...item,
        duration: item.selection.durationSeconds,
        fileName: item.artifact.fileName,
        downloadUrl: item.artifact.downloadUrl,
        outputMode: item.kind,
        subtitlesApplied: item.options.subtitlesApplied,
        watermarkApplied: item.options.watermarkApplied,
      }),
    );
  } catch (error) {
    response
      .status(statusCodeFor(error))
      .type("html")
      .send(`<h1>${escapeHtml(normalizeError(error))}</h1>`);
  }
}

export async function getSharedClipVideo(request, response) {
  try {
    const item = await getSharedHistoryEntry(request.params.clipId);
    await sendSharedExportAsset(response, {
      workspaceId: item.workspaceId,
      fileName: item.artifact.fileName,
    });
  } catch (error) {
    response
      .status(statusCodeFor(error))
      .type("html")
      .send(`<h1>${escapeHtml(normalizeError(error))}</h1>`);
  }
}
