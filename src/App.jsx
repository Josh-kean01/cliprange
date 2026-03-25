import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import AppHeader from "./components/AppHeader";
import ToastStack from "./components/ToastStack";
import {
  INITIAL_EDITOR,
  INITIAL_OUTPUT,
  clamp,
  extractYouTubeId,
  formatClock,
  getPercent,
  normalizeEditor,
  parseClock,
} from "./lib/cliprange";
import {
  ensureBackendReady,
  fetchJsonWithTimeout,
  getErrorMessage,
  triggerDownload,
  waitForJob,
} from "./lib/workspace-api";
import useSmoothProgress from "./lib/useSmoothProgress";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const shouldScrollToPreviewRef = useRef(false);
  const toastTimeoutsRef = useRef(new Map());

  const [editor, setEditor] = useState(() => normalizeEditor(INITIAL_EDITOR));
  const [output, setOutput] = useState(INITIAL_OUTPUT);
  const [startDraft, setStartDraft] = useState(
    formatClock(INITIAL_EDITOR.start),
  );
  const [endDraft, setEndDraft] = useState(formatClock(INITIAL_EDITOR.end));
  const [sourceStatus, setSourceStatus] = useState(
    "Ready to load a clip source.",
  );
  const [exportStatus, setExportStatus] = useState(
    "Select a range, then export your clip.",
  );
  const [retrievedVideo, setRetrievedVideo] = useState(null);
  const [latestExport, setLatestExport] = useState(null);
  const [retrieveJob, setRetrieveJob] = useState(null);
  const [exportJob, setExportJob] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [playerMuted, setPlayerMuted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [retrievingPreview, setRetrievingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const updateEditor = (updater) => {
    setEditor((current) =>
      normalizeEditor(
        typeof updater === "function" ? updater(current) : updater,
      ),
    );
  };

  const dismissToast = (toastId) => {
    const timeoutId = toastTimeoutsRef.current.get(toastId);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      toastTimeoutsRef.current.delete(toastId);
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  };

  const pushToast = (title, detail = "", tone = "info") => {
    const toastId =
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const timeoutId = window.setTimeout(() => {
      toastTimeoutsRef.current.delete(toastId);
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 3600);

    toastTimeoutsRef.current.set(toastId, timeoutId);
    setToasts((current) => [
      ...current.slice(-2),
      { id: toastId, title, detail, tone },
    ]);
  };

  const loadExportHistory = async () => {
    try {
      const payload = await fetchJsonWithTimeout("/api/history", {}, 3000);
      setExportHistory(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      return;
    }
  };

  useEffect(() => {
    void loadExportHistory();
  }, []);

  useEffect(() => {
    return () => {
      for (const timeoutId of toastTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      toastTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = playerMuted;

    for (const track of Array.from(video.textTracks ?? [])) {
      track.mode =
        captionsEnabled && retrievedVideo?.subtitleUrl ? "showing" : "hidden";
    }
  }, [playerMuted, captionsEnabled, retrievedVideo?.subtitleUrl]);

  useEffect(() => {
    setStartDraft(formatClock(editor.start));
  }, [editor.start]);

  useEffect(() => {
    setEndDraft(formatClock(editor.end));
  }, [editor.end]);

  useEffect(() => {
    const scrollTarget =
      stageRef.current?.closest("[data-preview-section='true']") ??
      stageRef.current;

    if (
      !shouldScrollToPreviewRef.current ||
      location.pathname !== "/editor" ||
      !scrollTarget
    ) {
      return;
    }

    shouldScrollToPreviewRef.current = false;

    window.requestAnimationFrame(() => {
      const headerOffset =
        document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      const targetTop =
        scrollTarget.getBoundingClientRect().top + window.scrollY;

      window.scrollTo({
        behavior: "smooth",
        top: Math.max(targetTop - headerOffset - 5, 0),
      });
    });
  }, [location.pathname, retrievedVideo]);

  const pausePreview = () => {
    videoRef.current?.pause();
  };

  const seekPreview = (time) => {
    const video = videoRef.current;

    if (!video || !Number.isFinite(time)) {
      return;
    }

    try {
      video.currentTime = time;
    } catch {
      return;
    }
  };

  const loadIntoEditor = (payload, options = {}) => {
    const nextDuration = Math.max(0, Number(payload.duration) || 0);
    const nextStart = clamp(options.start ?? 0, 0, nextDuration);
    const nextEnd = clamp(options.end ?? nextDuration, nextStart, nextDuration);

    setRetrievedVideo(payload);
    setCaptionsEnabled(false);
    updateEditor((current) => ({
      ...current,
      duration: nextDuration,
      start: nextStart,
      end: nextEnd,
      head: nextStart,
      playing: false,
      title: options.title ?? payload.title,
    }));

    if (options.output) {
      setOutput(options.output);
    }
  };

  const handleCopyShareLink = async (entry) => {
    if (!entry.shareUrl || !navigator.clipboard?.writeText) {
      setExportStatus("Share copying is not available in this browser.");
      pushToast(
        "Share link unavailable",
        "Clipboard access is blocked in this browser.",
        "warning",
      );
      return;
    }

    try {
      const absoluteUrl = new URL(
        entry.shareUrl,
        window.location.origin,
      ).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      setExportStatus("Share link copied to clipboard.");
      pushToast("Share link copied", entry.title, "success");
    } catch {
      setExportStatus("Share link copying was blocked by the browser.");
      pushToast(
        "Share link blocked",
        "The browser prevented clipboard access.",
        "warning",
      );
    }
  };

  const handleHistoryDelete = async (entry) => {
    try {
      await ensureBackendReady();
      await fetchJsonWithTimeout(
        `/api/history/${entry.clipId}`,
        { method: "DELETE" },
        5000,
      );

      if (latestExport?.clipId === entry.clipId) {
        setLatestExport(null);
      }

      await loadExportHistory();
      setExportStatus("History item removed.");
      pushToast("History item removed", entry.title, "info");
    } catch (error) {
      setExportStatus(
        getErrorMessage(error, "The history item could not be removed."),
      );
      pushToast("Could not remove history item", entry.title, "warning");
    }
  };

  const handleHistoryClear = async () => {
    try {
      await ensureBackendReady();
      await fetchJsonWithTimeout("/api/history", { method: "DELETE" }, 5000);
      setLatestExport(null);
      await loadExportHistory();
      setExportStatus("History cleared.");
      pushToast(
        "History cleared",
        "Recent exports and drafts were removed.",
        "info",
      );
    } catch (error) {
      setExportStatus(getErrorMessage(error, "History could not be cleared."));
      pushToast(
        "History clear failed",
        "The library could not be cleared.",
        "warning",
      );
    }
  };

  const handleHistoryReopen = async (entry) => {
    try {
      await ensureBackendReady();
      const payload = await fetchJsonWithTimeout(
        `/api/history/${entry.clipId}/reopen`,
        {
          method: "POST",
        },
        5000,
      );

      loadIntoEditor(payload, {
        start: entry.kind === "draft" ? entry.start : 0,
        end: entry.kind === "draft" ? entry.end : payload.duration,
        title: entry.title,
        output: {
          removeWatermark: Boolean(entry.removeWatermark),
          autoSubtitles: Boolean(entry.autoSubtitles),
        },
      });
      setLatestExport(entry);
      setSourceStatus(`Reopened ${entry.kind} from your library.`);
      setExportStatus("Selection restored in the editor.");
      navigate("/editor");
      pushToast("Selection restored", entry.title, "success");
    } catch (error) {
      setSourceStatus(
        getErrorMessage(error, "That history item could not be reopened."),
      );
      pushToast("Reopen failed", entry.title, "warning");
    }
  };

  const handleToggleMute = () => {
    setPlayerMuted((current) => {
      return !current;
    });
  };

  const handleToggleCaptions = () => {
    if (!retrievedVideo?.subtitleUrl) {
      setExportStatus("No subtitle track is available for this source.");
      pushToast(
        "Captions unavailable",
        "This clip does not have a subtitle track.",
        "warning",
      );
      return;
    }

    setCaptionsEnabled((current) => {
      return !current;
    });
  };

  const handleFullscreen = async () => {
    const target = stageRef.current;

    if (!target?.requestFullscreen) {
      setSourceStatus("Fullscreen is not supported in this browser.");
      pushToast(
        "Fullscreen unavailable",
        "This browser does not support fullscreen.",
        "warning",
      );
      return;
    }

    try {
      await target.requestFullscreen();
    } catch {
      setSourceStatus("Fullscreen could not be opened.");
      pushToast(
        "Fullscreen failed",
        "The player could not enter fullscreen mode.",
        "warning",
      );
    }
  };

  const handleRetrieveSubmit = async (event) => {
    event.preventDefault();
    const nextUrl = editor.url.trim();

    if (!nextUrl) {
      setSourceStatus("Paste a YouTube link to continue.");
      return;
    }

    if (!extractYouTubeId(nextUrl)) {
      setSourceStatus(
        "Enter a valid YouTube link to load the editable preview.",
      );
      return;
    }

    setRetrievingPreview(true);
    setRetrieveJob({ progress: 0, stage: "Queued retrieve job..." });
    pausePreview();
    setLatestExport(null);
    setSourceStatus("Queued retrieve job...");
    pushToast(
      "Retrieving clip",
      "ClipRange is downloading the local preview.",
      "info",
    );

    try {
      await ensureBackendReady();
      const queuedJob = await fetchJsonWithTimeout(
        "/api/retrieve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: nextUrl }),
        },
        5000,
      );

      const finalJob = await waitForJob(queuedJob.jobId, (job) => {
        setRetrieveJob(job);
        setSourceStatus(job.stage);
      });

      if (finalJob.status === "failed") {
        throw new Error(finalJob.error || "The source could not be retrieved.");
      }

      const payload = finalJob.result;
      shouldScrollToPreviewRef.current = true;
      loadIntoEditor(payload, {
        start: 0,
        end: payload.duration,
        title: payload.title,
      });
      navigate("/editor");
      setSourceStatus(
        `${finalJob.stage || "Source downloaded locally. Use the trim controls below."}${
          payload.subtitleUrl ? " Captions available." : ""
        }`,
      );
      setExportStatus("Select a range, then export your clip.");
      pushToast("Clip ready", payload.title, "success");
    } catch (error) {
      setRetrievedVideo(null);
      setSourceStatus(
        getErrorMessage(error, "The source could not be retrieved."),
      );
      pushToast(
        "Retrieve failed",
        getErrorMessage(error, "The source could not be retrieved."),
        "warning",
      );
    } finally {
      setRetrieveJob(null);
      setRetrievingPreview(false);
    }
  };

  const handlePaste = async () => {
    if (!navigator.clipboard?.readText) {
      setSourceStatus("Clipboard access is not available in this browser.");
      pushToast(
        "Clipboard unavailable",
        "Paste is not available in this browser.",
        "warning",
      );
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      updateEditor((current) => ({ ...current, url: text }));
      setSourceStatus("Pasted link from clipboard.");
      pushToast(
        "Source pasted",
        "YouTube link inserted from clipboard.",
        "info",
      );
    } catch {
      setSourceStatus("Clipboard access was denied.");
      pushToast("Paste failed", "Clipboard access was denied.", "warning");
    }
  };

  const clearRetrievedSource = () => {
    pausePreview();
    setRetrievedVideo(null);
    setLatestExport(null);
    setRetrieveJob(null);
    setExportJob(null);
    setCaptionsEnabled(false);
    updateEditor((current) => ({
      ...current,
      duration: 0,
      start: 0,
      end: 0,
      head: 0,
      playing: false,
      title: "",
      url: "",
    }));
    setSourceStatus("Source cleared.");
    setExportStatus("Select a range, then export your clip.");
    pushToast("Source cleared", "The editor has been reset.", "info");
  };

  const handleVideoLoadedMetadata = (event) => {
    const duration = Math.max(1, Math.floor(event.currentTarget.duration || 0));

    updateEditor((current) => ({
      ...current,
      duration,
      end: current.end || duration,
      head: Math.min(current.head, duration),
    }));
    seekPreview(editor.start);
  };

  const handleVideoTimeUpdate = (event) => {
    const currentTime = event.currentTarget.currentTime;

    if (editor.end && currentTime >= editor.end) {
      event.currentTarget.pause();
      seekPreview(editor.end);
      updateEditor((current) => ({
        ...current,
        head: current.end,
        playing: false,
      }));
      return;
    }

    updateEditor((current) => ({
      ...current,
      head: currentTime,
    }));
  };

  const handleStartChange = (nextStart) => {
    if (videoRef.current && videoRef.current.currentTime < nextStart) {
      seekPreview(nextStart);
    }

    updateEditor((current) => ({
      ...current,
      start: nextStart,
      head: Math.max(current.head, nextStart),
    }));
  };

  const handleEndChange = (nextEnd) => {
    if (videoRef.current && videoRef.current.currentTime > nextEnd) {
      seekPreview(nextEnd);
    }

    updateEditor((current) => ({
      ...current,
      end: nextEnd,
      head: Math.min(current.head, nextEnd),
    }));
  };

  const handleHeadChange = (nextHead) => {
    seekPreview(nextHead);
    updateEditor((current) => ({
      ...current,
      head: nextHead,
      playing: false,
    }));
  };

  const exportClip = async () => {
    if (!retrievedVideo?.sessionId) {
      setExportStatus("Retrieve a source before exporting a clip.");
      return;
    }

    if (editor.end <= editor.start) {
      setExportStatus("Set an end time that is later than the start time.");
      return;
    }

    setExporting(true);
    setExportJob({ progress: 0, stage: "Queued export job..." });
    setExportStatus("Queued export job...");
    pushToast(
      editor.mode === "draft"
        ? "Saving draft"
        : editor.mode === "share"
          ? "Creating share link"
          : "Exporting clip",
      editor.title || retrievedVideo.title || "Clip export",
      "info",
    );

    try {
      await ensureBackendReady();
      const queuedJob = await fetchJsonWithTimeout(
        "/api/trim",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: retrievedVideo.sessionId,
            start: editor.start,
            end: editor.end,
            title: editor.title || retrievedVideo.title,
            sourceTitle: retrievedVideo.title,
            sourceUrl: retrievedVideo.sourceUrl,
            thumbnailUrl: retrievedVideo.thumbnailUrl,
            outputMode: editor.mode,
            removeWatermark: output.removeWatermark,
            autoSubtitles: output.autoSubtitles,
          }),
        },
        5000,
      );

      const finalJob = await waitForJob(queuedJob.jobId, (job) => {
        setExportJob(job);
        setExportStatus(job.stage);
      });

      if (finalJob.status === "failed") {
        throw new Error(finalJob.error || "The clip export failed.");
      }

      const payload = finalJob.result;
      const noteSuffix = payload.notes?.length ? ` ${payload.notes[0]}` : "";

      setLatestExport(payload);
      setExportStatus(`${finalJob.stage || "Export finished."}${noteSuffix}`);
      await loadExportHistory();
      pushToast(
        payload.kind === "draft"
          ? "Draft saved"
          : payload.kind === "share"
            ? "Share clip ready"
            : "Clip exported",
        payload.title,
        "success",
      );

      if (payload.kind === "share" && payload.shareUrl) {
        await handleCopyShareLink(payload);
      } else if (payload.kind === "download" && payload.downloadUrl) {
        triggerDownload(payload.downloadUrl, payload.fileName);
      } else if (payload.kind === "draft") {
        navigate("/library");
      }
    } catch (error) {
      setExportStatus(getErrorMessage(error, "The clip export failed."));
      pushToast(
        "Export failed",
        getErrorMessage(error, "The clip export failed."),
        "warning",
      );
    } finally {
      setExportJob(null);
      setExporting(false);
    }
  };

  const commitDraft = (kind) => {
    const draft = kind === "start" ? startDraft : endDraft;
    const parsed = parseClock(draft);

    if (parsed === null) {
      if (kind === "start") {
        setStartDraft(formatClock(editor.start));
      } else {
        setEndDraft(formatClock(editor.end));
      }
      return;
    }

    if (kind === "start") {
      handleStartChange(parsed);
      return;
    }

    handleEndChange(parsed);
  };

  const setBoundaryFromHead = (kind) => {
    const currentTime = videoRef.current?.currentTime ?? editor.head;

    if (kind === "start") {
      updateEditor((current) => ({
        ...current,
        start: currentTime,
        head: Math.max(current.head, currentTime),
      }));
      return;
    }

    updateEditor((current) => ({
      ...current,
      end: currentTime,
      head: Math.min(current.head, currentTime),
    }));
  };

  const shiftSelection = (delta) => {
    updateEditor((current) => ({
      ...current,
      start: current.start + delta,
      end: current.end + delta,
      head: current.head + delta,
    }));
  };

  const resetSelection = () => {
    pausePreview();
    seekPreview(0);
    updateEditor((current) => ({
      ...current,
      start: 0,
      end: current.duration,
      head: 0,
      playing: false,
    }));
  };

  const togglePlayback = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (editor.playing) {
      pausePreview();
      updateEditor((current) => ({
        ...current,
        playing: false,
      }));
      return;
    }

    if (video.currentTime < editor.start || video.currentTime >= editor.end) {
      seekPreview(editor.start);
    }

    try {
      await video.play();
      updateEditor((current) => ({
        ...current,
        playing: true,
      }));
    } catch {
      setSourceStatus("Preview playback could not start.");
      pushToast(
        "Playback failed",
        "The preview could not start playing.",
        "warning",
      );
    }
  };

  const previewRange = async () => {
    if (!retrievedVideo) {
      return;
    }

    seekPreview(editor.start);

    try {
      await videoRef.current?.play();
      updateEditor((current) => ({
        ...current,
        playing: true,
      }));
    } catch {
      setSourceStatus("Preview playback could not start.");
      pushToast(
        "Playback failed",
        "The preview could not start playing.",
        "warning",
      );
    }
  };

  const fineNudge = (delta) => {
    const nextHead = clamp(editor.head + delta, 0, editor.duration);
    handleHeadChange(nextHead);
  };

  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );
    };

    const onKeyDown = (event) => {
      if (
        location.pathname !== "/editor" ||
        isTypingTarget(event.target) ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (!retrievedVideo) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === " " || key === "k") {
        event.preventDefault();
        void togglePlayback();
        return;
      }

      if (key === "j") {
        event.preventDefault();
        fineNudge(-5);
        return;
      }

      if (key === "l") {
        event.preventDefault();
        fineNudge(5);
        return;
      }

      if (key === "i") {
        event.preventDefault();
        setBoundaryFromHead("start");
        pushToast(
          "Start trimmed",
          `New start: ${formatClock(videoRef.current?.currentTime ?? editor.head)}`,
          "info",
        );
        return;
      }

      if (key === "o") {
        event.preventDefault();
        setBoundaryFromHead("end");
        pushToast(
          "End trimmed",
          `New end: ${formatClock(videoRef.current?.currentTime ?? editor.head)}`,
          "info",
        );
        return;
      }

      if (key === "m") {
        event.preventDefault();
        handleToggleMute();
        return;
      }

      if (key === "c") {
        event.preventDefault();
        handleToggleCaptions();
        return;
      }

      if (key === "f") {
        event.preventDefault();
        void handleFullscreen();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (event.shiftKey) {
          shiftSelection(-1);
        } else {
          fineNudge(-0.5);
        }
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (event.shiftKey) {
          shiftSelection(1);
        } else {
          fineNudge(0.5);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [location.pathname, editor.head, retrievedVideo]);

  const retrieveProgressTarget = retrievingPreview
    ? Math.max(6, retrieveJob?.progress ?? 0)
    : 0;
  const exportProgressTarget = exporting ? Math.max(6, exportJob?.progress ?? 0) : 0;
  const retrieveProgress = useSmoothProgress(
    retrieveProgressTarget,
    retrievingPreview,
  );
  const exportProgress = useSmoothProgress(exportProgressTarget, exporting);
  const startPct = getPercent(editor.start, editor.duration);
  const endPct = getPercent(editor.end, editor.duration);
  const headPct = getPercent(editor.head, editor.duration);
  const outletContext = {
    onOpenEditor: () => navigate("/editor"),
    onOpenLibrary: () => navigate("/library"),
    libraryCount: exportHistory.length,
    editor,
    output,
    retrievedVideo,
    latestExport,
    playerMuted,
    captionsEnabled,
    retrievingPreview,
    retrieveProgress,
    exporting,
    exportProgress,
    sourceStatus,
    exportStatus,
    startDraft,
    endDraft,
    startPct,
    endPct,
    headPct,
    stageRef,
    videoRef,
    exportHistory,
    onSubmit: handleRetrieveSubmit,
    onUrlChange: (value) =>
      updateEditor((current) => ({ ...current, url: value })),
    onPaste: handlePaste,
    onClear: clearRetrievedSource,
    onLoadedMetadata: handleVideoLoadedMetadata,
    onTimeUpdate: handleVideoTimeUpdate,
    onPause: () => updateEditor((current) => ({ ...current, playing: false })),
    onPlay: () => updateEditor((current) => ({ ...current, playing: true })),
    onTogglePlayback: togglePlayback,
    onToggleMute: handleToggleMute,
    onToggleCaptions: handleToggleCaptions,
    onFullscreen: handleFullscreen,
    onStartChange: handleStartChange,
    onEndChange: handleEndChange,
    onHeadChange: handleHeadChange,
    onStartDraftChange: setStartDraft,
    onEndDraftChange: setEndDraft,
    onCommitDraft: commitDraft,
    onSetBoundary: setBoundaryFromHead,
    onShiftSelection: shiftSelection,
    onResetSelection: resetSelection,
    onPreviewRange: previewRange,
    onModeChange: (value) =>
      updateEditor((current) => ({ ...current, mode: value })),
    onWatermarkChange: (value) =>
      setOutput((current) => ({ ...current, removeWatermark: value })),
    onSubtitlesChange: (value) =>
      setOutput((current) => ({ ...current, autoSubtitles: value })),
    onTitleChange: (value) =>
      updateEditor((current) => ({ ...current, title: value })),
    onRefreshHistory: loadExportHistory,
    onClearHistory: handleHistoryClear,
    onReopenHistory: handleHistoryReopen,
    onDeleteHistory: handleHistoryDelete,
    onCopyShare: handleCopyShareLink,
    onExport: exportClip,
  };

  return (
    <>
      <div className="relative min-h-screen bg-[#05060f] text-slate-100">
        <div className="relative z-10">
          <AppHeader />
          <Outlet context={outletContext} />
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
