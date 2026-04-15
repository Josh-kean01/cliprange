import { useNavigate } from "react-router-dom";

import {
  clearHistoryEntries,
  deleteHistoryEntry as deleteHistoryEntryRequest,
  reopenHistoryEntry as reopenHistoryEntryRequest,
} from "../../../api/endpoints/history-api";
import { getErrorMessage } from "../../../api/client/http-client";
import { copyTextToClipboard } from "../../../services/clipboard-service";
import { useLibraryStore } from "../../../state/library/LibraryProvider";
import { useToast } from "../../../state/ui/ToastProvider";
import { useEditorSession } from "../../editor-session/hooks/useEditorSession";

export function useLibraryActions() {
  const navigate = useNavigate();
  const { state, refreshLibrary } = useLibraryStore();
  const editorSession = useEditorSession();
  const { pushToast } = useToast();

  async function copyShareLink(entry) {
    if (!entry?.shareUrl) {
      editorSession.setExportStatus("Share copying is not available for this clip.");
      pushToast("Share link unavailable", entry?.title ?? "", "warning");
      return;
    }

    try {
      const absoluteUrl = new URL(entry.shareUrl, window.location.origin).toString();
      await copyTextToClipboard(absoluteUrl);
      editorSession.setExportStatus("Share link copied to clipboard.");
      pushToast("Share link copied", entry.title, "success");
    } catch (error) {
      editorSession.setExportStatus(
        getErrorMessage(error, "Share link copying was blocked by the browser."),
      );
      pushToast(
        "Share link blocked",
        "The browser prevented clipboard access.",
        "warning",
      );
    }
  }

  async function clearHistory() {
    try {
      await clearHistoryEntries();
      editorSession.setLatestResult(null);
      await refreshLibrary();
      editorSession.setExportStatus("History cleared.");
      pushToast(
        "History cleared",
        "Recent exports and drafts were removed.",
        "info",
      );
    } catch (error) {
      editorSession.setExportStatus(
        getErrorMessage(error, "History could not be cleared."),
      );
      pushToast(
        "History clear failed",
        "The library could not be cleared.",
        "warning",
      );
    }
  }

  async function deleteHistory(entry) {
    try {
      await deleteHistoryEntryRequest(entry.entryId);

      if (editorSession.state.latestResult?.historyEntry?.entryId === entry.entryId) {
        editorSession.setLatestResult(null);
      }

      await refreshLibrary();
      editorSession.setExportStatus("History item removed.");
      pushToast("History item removed", entry.title, "info");
    } catch (error) {
      editorSession.setExportStatus(
        getErrorMessage(error, "The history item could not be removed."),
      );
      pushToast("Could not remove history item", entry.title, "warning");
    }
  }

  async function reopenHistory(entry) {
    try {
      const session = await reopenHistoryEntryRequest(entry.entryId);

      editorSession.loadSession(session, {
        startSeconds: entry.kind === "draft" ? entry.selection.startSeconds : 0,
        endSeconds:
          entry.kind === "draft"
            ? entry.selection.endSeconds
            : session.durationSeconds,
        headSeconds: entry.kind === "draft" ? entry.selection.startSeconds : 0,
        title: entry.title,
        outputOptions: {
          removeWatermark: Boolean(entry.options.removeWatermark),
          autoSubtitles: Boolean(entry.options.autoSubtitles),
        },
      });
      editorSession.setLatestResult(buildResultFromHistory(entry));
      editorSession.setSourceStatus(`Reopened ${entry.kind} from your library.`);
      editorSession.setExportStatus("Selection restored in the editor.");
      navigate("/editor");
      pushToast("Selection restored", entry.title, "success");
    } catch (error) {
      editorSession.setSourceStatus(
        getErrorMessage(error, "That history item could not be reopened."),
      );
      pushToast("Reopen failed", entry.title, "warning");
    }
  }

  return {
    items: state.items,
    refreshLibrary,
    clearHistory,
    deleteHistory,
    reopenHistory,
    copyShareLink,
  };
}

function buildResultFromHistory(entry) {
  return {
    resultId: entry.entryId,
    outputMode: entry.kind,
    historyEntry: entry,
    artifactState: entry.kind === "draft" ? "saved" : "rendered",
    download: entry.downloadUrl
      ? {
          url: entry.downloadUrl,
          fileName: entry.fileName,
        }
      : null,
    share: entry.shareUrl
      ? {
          url: entry.shareUrl,
          openUrl: entry.shareUrl,
        }
      : null,
    notes: entry.notes,
    lineage: entry.lineage,
  };
}
