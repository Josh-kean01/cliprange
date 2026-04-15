import { useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/client/http-client";
import { createTrimJob } from "../../../api/endpoints/export-api";
import useSmoothProgress from "../../../hooks/useSmoothProgress";
import { copyTextToClipboard } from "../../../services/clipboard-service";
import { triggerBrowserDownload } from "../../../services/download-service";
import { useJobsStore } from "../../../state/jobs/JobsProvider";
import { useLibraryStore } from "../../../state/library/LibraryProvider";
import { useToast } from "../../../state/ui/ToastProvider";
import { useEditorSession } from "../../editor-session/hooks/useEditorSession";

export function useExportWorkflow() {
  const navigate = useNavigate();
  const jobsStore = useJobsStore();
  const libraryStore = useLibraryStore();
  const editorSession = useEditorSession();
  const { pushToast } = useToast();

  const exporting = jobsStore.state.export.active;
  const exportJob = jobsStore.state.export.job;
  const exportProgressTarget = exporting
    ? Math.max(6, exportJob?.progressPercent ?? 0)
    : 0;
  const exportProgress = useSmoothProgress(
    exportProgressTarget,
    exporting,
    exportJob?.updatedAt,
  );

  async function exportClip() {
    const session = editorSession.state.session;
    const selection = editorSession.state.selection;

    if (!session?.sessionId) {
      editorSession.setExportStatus("Retrieve a source before exporting a clip.");
      return;
    }

    if (selection.endSeconds <= selection.startSeconds) {
      editorSession.setExportStatus(
        "Set an end time that is later than the start time.",
      );
      return;
    }

    jobsStore.startJob("export", {
      message: "Queued export job...",
      progressPercent: 0,
    });
    editorSession.setExportStatus("Queued export job...");
    pushToast(
      editorSession.state.outputMode === "draft"
        ? "Saving draft"
        : editorSession.state.outputMode === "share"
          ? "Creating share link"
          : "Exporting clip",
      editorSession.state.title || session.title || "Clip export",
      "info",
    );

    try {
      const { job, result } = await createTrimJob(
        {
          sessionId: session.sessionId,
          selection: {
            startSeconds: selection.startSeconds,
            endSeconds: selection.endSeconds,
          },
          title: editorSession.state.title || session.title,
          outputMode: editorSession.state.outputMode,
          subtitlePolicy: {
            mode: editorSession.state.outputOptions.autoSubtitles ? "auto" : "off",
          },
          watermarkPolicy: {
            mode: editorSession.state.outputOptions.removeWatermark
              ? "remove"
              : "keep",
          },
          tags: session.tags,
        },
        (progressJob) => {
          jobsStore.updateJob("export", progressJob);
          editorSession.setExportStatus(progressJob.message);
        },
      );

      const noteSuffix = result.notes?.length ? ` ${result.notes[0]}` : "";

      editorSession.setLatestResult(result);
      editorSession.setExportStatus(
        `${job.message || "Export finished."}${noteSuffix}`,
      );
      void libraryStore.refreshLibrary();
      pushToast(
        result.historyEntry.kind === "draft"
          ? "Draft saved"
          : result.historyEntry.kind === "share"
            ? "Share clip ready"
            : "Clip exported",
        result.historyEntry.title,
        "success",
      );

      if (result.share?.url) {
        const absoluteUrl = new URL(
          result.share.url,
          window.location.origin,
        ).toString();
        editorSession.setExportStatus("Share link ready.");

        try {
          await copyTextToClipboard(absoluteUrl);
          editorSession.setExportStatus("Share link copied to clipboard.");
        } catch {
          editorSession.setExportStatus(
            "Share link ready. Copy it manually below.",
          );
          pushToast(
            "Share link ready",
            "Clipboard access was blocked. Use the actions below to copy or open it.",
            "warning",
          );
        }
      } else if (result.download?.url) {
        triggerBrowserDownload(result.download.url, result.download.fileName);
      } else if (result.historyEntry.kind === "draft") {
        navigate("/library");
      }
    } catch (error) {
      editorSession.setExportStatus(
        getErrorMessage(error, "The clip export failed."),
      );
      pushToast(
        "Export failed",
        getErrorMessage(error, "The clip export failed."),
        "warning",
      );
    } finally {
      jobsStore.clearJob("export");
    }
  }

  return {
    exporting,
    exportProgress,
    exportStatus: editorSession.state.exportStatus,
    latestResult: editorSession.state.latestResult,
    onExport: exportClip,
  };
}
