import { Router } from "express";

import {
  getExportMedia,
  getSessionMedia,
} from "../controllers/media-controller.js";
import { ensureWorkspaceContext } from "../middleware/workspace-context.js";

const router = Router();

router.use(ensureWorkspaceContext);
router.get("/session/:sessionId/:fileName", getSessionMedia);
router.get("/export/:fileName", getExportMedia);

export default router;
