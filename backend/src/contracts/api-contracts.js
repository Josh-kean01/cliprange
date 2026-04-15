export const CONTRACT_VERSION = 1;

export const API_CONTRACTS = {
  EditorSession: {
    purpose: "Hydrate the editor after retrieve or reopen.",
    required: [
      "sessionId",
      "source",
      "title",
      "durationSeconds",
      "preview",
      "selection",
      "capabilities",
    ],
    optional: [
      "metaSummary",
      "thumbnailUrl",
      "subtitleTrack",
      "tags",
      "videoDetails",
      "source.sourceKind",
      "source.requestedQuality",
      "source.retrievedQuality",
      "lineage",
    ],
  },
  TrimRequest: {
    purpose: "Submit a draft, share, or download export request.",
    required: ["sessionId", "selection.startSeconds", "selection.endSeconds", "outputMode"],
    optional: ["title", "subtitlePolicy", "watermarkPolicy", "tags"],
  },
  TrimResult: {
    purpose: "Return the outcome of an export workflow.",
    required: ["resultId", "outputMode", "historyEntry", "artifactState"],
    optional: ["download", "share", "notes", "lineage"],
  },
  JobStatus: {
    purpose: "Expose pollable job state for retrieval and export.",
    required: [
      "jobId",
      "jobType",
      "status",
      "stageCode",
      "progressPercent",
      "submittedAt",
      "updatedAt",
    ],
    optional: ["message", "result", "error"],
  },
  HistoryEntry: {
    purpose: "Describe a library item that can be reopened or delivered.",
    required: ["entryId", "kind", "title", "createdAt", "selection", "sourceRef", "reopen"],
    optional: [
      "sourceTitle",
      "thumbnailUrl",
      "tags",
      "downloadUrl",
      "shareUrl",
      "fileName",
      "notes",
      "lineage",
      "sourceRef.sourceKind",
      "options",
    ],
  },
};

export function getContractArtifact() {
  return {
    contractVersion: CONTRACT_VERSION,
    dtos: API_CONTRACTS,
    routes: {
      retrieve: "POST /api/retrieve",
      trim: "POST /api/trim",
      jobStatus: "GET /api/jobs/:jobId",
      historyList: "GET /api/history",
      historyDelete: "DELETE /api/history/:entryId",
      historyReopen: "POST /api/history/:entryId/reopen",
      sessionMedia: "GET /media/session/:sessionId/:fileName",
      exportMedia: "GET /media/export/:fileName",
      sharedClip: "GET /share/:clipId",
      sharedVideo: "GET /share/:clipId/video",
    },
  };
}
