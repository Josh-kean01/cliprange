export function createAppError({
  statusCode = 500,
  code = "INTERNAL_ERROR",
  stage = "",
  message = "The media pipeline hit an unexpected error.",
  userMessage = message,
  retryable = false,
  cause = undefined,
} = {}) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.name = "ClipRangeError";
  error.statusCode = statusCode;
  error.code = code;
  error.stage = stage;
  error.userMessage = userMessage;
  error.retryable = retryable;
  return error;
}

export function createHttpError(statusCode, message, options = {}) {
  return createAppError({
    ...options,
    statusCode,
    message,
    userMessage: options.userMessage ?? message,
  });
}

export function isAppError(error) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "statusCode" in error &&
      "code" in error &&
      error instanceof Error,
  );
}

export function statusCodeFor(error) {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = Number(error.statusCode);

    if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
      return statusCode;
    }
  }

  return 500;
}

export function normalizeError(error) {
  if (isAppError(error)) {
    return error.userMessage || error.message;
  }

  if (
    error instanceof Error &&
    /yt-dlp|ffmpeg|ffprobe/i.test(error.message)
  ) {
    return "The media tools could not complete that request.";
  }

  if (
    error instanceof Error &&
    /ENOENT|EACCES|EPERM|spawn/i.test(error.message)
  ) {
    return "The media pipeline is unavailable right now.";
  }

  return "The media pipeline hit an unexpected error.";
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
