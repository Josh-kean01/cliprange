import { isAllowedSourceUrl } from "../utils/clip-utils.js";
import { createHttpError } from "../utils/http.js";
import { normalizeRetrieveQuality } from "../utils/retrieve-quality.js";

export function parseRetrieveRequest(body) {
  const url = String(body?.url ?? "").trim();
  const quality = normalizeRetrieveQuality(body?.quality);

  if (!url) {
    throw createHttpError(400, "Paste a YouTube URL to continue.");
  }

  if (!isAllowedSourceUrl(url)) {
    throw createHttpError(400, "Only YouTube links are supported.");
  }

  return {
    url,
    quality,
  };
}
