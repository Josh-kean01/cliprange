import express from "express";

import {
  frontendDistDir,
  frontendIndexHtmlPath,
} from "../config/runtime.js";
import { ensureWorkspaceContext } from "../http/middleware/workspace-context.js";
import apiRoutes from "../http/routes/api-routes.js";
import mediaRoutes from "../http/routes/media-routes.js";
import shareRoutes from "../http/routes/share-routes.js";

export function createApp({ hasBuiltClient }) {
  const app = express();

  app.set("trust proxy", 1);
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    response.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(frontendDistDir, { index: false, fallthrough: true }));

  app.use("/api", ensureWorkspaceContext, apiRoutes);
  app.use("/media", mediaRoutes);
  app.use("/share", shareRoutes);

  app.get(/^(?!\/(?:api|media|share)(?:\/|$)).*/, (_request, response, next) => {
    if (!hasBuiltClient) {
      next();
      return;
    }

    response.sendFile(frontendIndexHtmlPath);
  });

  return app;
}
