import { Router } from "express";

import {
  getSharedClipPage,
  getSharedClipVideo,
} from "../controllers/share-controller.js";

const router = Router();

router.get("/:clipId", getSharedClipPage);
router.get("/:clipId/video", getSharedClipVideo);

export default router;
