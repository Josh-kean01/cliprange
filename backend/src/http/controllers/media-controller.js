import {
  sendPrivateExportAsset,
  sendPrivateSessionAsset,
} from "../../storage/asset-delivery-service.js";
import { normalizeError, statusCodeFor } from "../../utils/http.js";

export async function getSessionMedia(request, response) {
  try {
    await sendPrivateSessionAsset(
      request.workspaceId,
      request.params.sessionId,
      request.params.fileName,
      response,
    );
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
}

export async function getExportMedia(request, response) {
  try {
    await sendPrivateExportAsset(
      request.workspaceId,
      request.params.fileName,
      response,
    );
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
}
