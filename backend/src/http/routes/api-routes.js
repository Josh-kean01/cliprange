import { Router } from "express";

import {
  clearHistory,
  createRetrieveJobHandler,
  createTrimJobHandler,
  deleteHistoryItem,
  getHealth,
  getJobStatus,
  listHistory,
  reopenHistoryEntry,
} from "../controllers/api-controller.js";

const router = Router();

router.get("/health", getHealth);
router.get("/jobs/:jobId", getJobStatus);
router.get("/history", listHistory);
router.delete("/history", clearHistory);
router.delete("/history/:entryId", deleteHistoryItem);
router.post("/history/:entryId/reopen", reopenHistoryEntry);
router.post("/retrieve", createRetrieveJobHandler);
router.post("/trim", createTrimJobHandler);

export default router;
