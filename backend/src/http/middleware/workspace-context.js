import crypto from "node:crypto";

import {
  sessionCookieMaxAgeMs,
  sessionSecret,
  workspaceCookieName,
} from "../../config/runtime.js";
import { ensureWorkspaceDirectories } from "../../storage/workspace-paths.js";
import { normalizeError, statusCodeFor } from "../../utils/http.js";

export async function ensureWorkspaceContext(request, response, next) {
  try {
    let workspaceId = readWorkspaceIdFromCookie(request.headers.cookie);

    if (!workspaceId) {
      workspaceId = crypto.randomUUID();
      response.append("Set-Cookie", createWorkspaceCookie(workspaceId));
    }

    request.workspaceId = workspaceId;
    await ensureWorkspaceDirectories(workspaceId);
    next();
  } catch (error) {
    response.status(statusCodeFor(error)).json({ error: normalizeError(error) });
  }
}

function parseCookies(cookieHeader) {
  return String(cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function signWorkspaceId(workspaceId) {
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(workspaceId)
    .digest("base64url");
}

function serializeCookie(name, value, options = {}) {
  const pieces = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge) {
    pieces.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }

  if (options.path) {
    pieces.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    pieces.push("HttpOnly");
  }

  if (options.sameSite) {
    pieces.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    pieces.push("Secure");
  }

  return pieces.join("; ");
}

function readWorkspaceIdFromCookie(cookieHeader) {
  const rawCookie = parseCookies(cookieHeader)[workspaceCookieName];

  if (!rawCookie) {
    return "";
  }

  const [workspaceId, signature] = rawCookie.split(".");

  if (!workspaceId || !signature) {
    return "";
  }

  const expectedSignature = signWorkspaceId(workspaceId);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return "";
  }

  return workspaceId;
}

function createWorkspaceCookie(workspaceId) {
  return serializeCookie(
    workspaceCookieName,
    `${workspaceId}.${signWorkspaceId(workspaceId)}`,
    {
      maxAge: sessionCookieMaxAgeMs,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}
