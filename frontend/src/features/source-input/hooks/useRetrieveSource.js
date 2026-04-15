import { useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/client/http-client";
import { createRetrieveJob } from "../../../api/endpoints/ingestion-api";
import useSmoothProgress from "../../../hooks/useSmoothProgress";
import { useJobsStore } from "../../../state/jobs/JobsProvider";
import { useToast } from "../../../state/ui/ToastProvider";
import { extractYouTubeId } from "../../../utils/cliprange";
import { getRetrieveQualityOption } from "../../../utils/retrieve-quality";
import { useEditorSession } from "../../editor-session/hooks/useEditorSession";

export function useRetrieveSource() {
  const navigate = useNavigate();
  const editorSession = useEditorSession();
  const jobsStore = useJobsStore();
  const { pushToast } = useToast();

  const retrievingPreview = jobsStore.state.retrieve.active;
  const retrieveJob = jobsStore.state.retrieve.job;
  const retrieveProgressTarget = retrievingPreview
    ? Math.max(6, retrieveJob?.progressPercent ?? 0)
    : 0;
  const retrieveProgress = useSmoothProgress(
    retrieveProgressTarget,
    retrievingPreview,
    retrieveJob?.updatedAt,
  );

  async function submitRetrieve(event) {
    event.preventDefault();
    const nextUrl = editorSession.state.requestUrl.trim();
    const nextQuality = editorSession.state.requestQuality;
    const qualityOption = getRetrieveQualityOption(nextQuality);

    if (!nextUrl) {
      editorSession.setSourceStatus("Paste a YouTube link to continue.");
      return;
    }

    if (!extractYouTubeId(nextUrl)) {
      editorSession.setSourceStatus(
        "Enter a valid YouTube link to load the editable preview.",
      );
      return;
    }

    jobsStore.startJob("retrieve", {
      message: "Queued retrieve job...",
      progressPercent: 0,
    });
    editorSession.setLatestResult(null);
    editorSession.setSourceStatus(`Queued ${qualityOption.label} retrieve job...`);
    pushToast(
      "Retrieving clip",
      `ClipRange is downloading a ${qualityOption.label} local preview.`,
      "info",
    );

    try {
      const { job, session } = await createRetrieveJob(
        nextUrl,
        nextQuality,
        (progressJob) => {
          jobsStore.updateJob("retrieve", progressJob);
          editorSession.setSourceStatus(progressJob.message);
        },
      );

      editorSession.loadSession(session, {
        startSeconds: 0,
        endSeconds: session.durationSeconds,
        headSeconds: 0,
        title: session.title,
      });
      navigate("/editor");
      editorSession.setSourceStatus(
        job.message || "Source downloaded locally. Use the trim controls below.",
      );
      editorSession.setExportStatus("Select a range, then export your clip.");
      pushToast(
        "Clip ready",
        session.source.retrievedQuality?.label
          ? `${session.title} - ${session.source.retrievedQuality.label}`
          : session.title,
        "success",
      );
    } catch (error) {
      editorSession.setSourceStatus(
        getErrorMessage(error, "The source could not be retrieved."),
      );
      pushToast(
        "Retrieve failed",
        getErrorMessage(error, "The source could not be retrieved."),
        "warning",
      );
    } finally {
      jobsStore.clearJob("retrieve");
    }
  }

  async function pasteSource() {
    if (!navigator.clipboard?.readText) {
      editorSession.setSourceStatus("Clipboard access is not available in this browser.");
      pushToast(
        "Clipboard unavailable",
        "Paste is not available in this browser.",
        "warning",
      );
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      editorSession.setRequestUrl(text);
      editorSession.setSourceStatus("Pasted link from clipboard.");
      pushToast("Source pasted", "YouTube link inserted from clipboard.", "info");
    } catch {
      editorSession.setSourceStatus("Clipboard access was denied.");
      pushToast("Paste failed", "Clipboard access was denied.", "warning");
    }
  }

  function clearSource() {
    editorSession.clearSession();
    pushToast("Source cleared", "The editor has been reset.", "info");
  }

  return {
    url: editorSession.state.requestUrl,
    quality: editorSession.state.requestQuality,
    retrievingPreview,
    retrieveProgress,
    sourceStatus: editorSession.state.sourceStatus,
    onSubmit: submitRetrieve,
    onUrlChange: editorSession.setRequestUrl,
    onQualityChange: editorSession.setRequestQuality,
    onPaste: pasteSource,
    onClear: clearSource,
  };
}
