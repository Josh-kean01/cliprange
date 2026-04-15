import { useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../../../api/client/http-client";
import { useToast } from "../../../state/ui/ToastProvider";
import { useEditorSession } from "../../editor-session/hooks/useEditorSession";

export function usePreviewController() {
  const editorSession = useEditorSession();
  const { pushToast } = useToast();
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const [headSeconds, setHeadSeconds] = useState(0);
  const liveHeadRef = useRef(0);
  const lastCommittedHeadRef = useRef(0);
  const lastCommitAtRef = useRef(0);
  const session = editorSession.state.session;
  const selection = editorSession.state.selection;

  useEffect(() => {
    const nextHead = clampHead(
      selection.headSeconds,
      selection.startSeconds,
      selection.endSeconds,
    );

    syncHead(nextHead, true);
  }, [session?.sessionId, selection.headSeconds]);

  useEffect(() => {
    if (!session?.sessionId) {
      syncHead(0, true);
      return;
    }

    const clampedHead = clampHead(
      liveHeadRef.current,
      selection.startSeconds,
      selection.endSeconds,
    );

    if (clampedHead !== liveHeadRef.current) {
      syncHead(clampedHead, true);
    }
  }, [selection.endSeconds, selection.startSeconds, session?.sessionId]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = editorSession.state.playback.playerMuted;

    for (const track of Array.from(video.textTracks ?? [])) {
      track.mode =
        editorSession.state.playback.captionsEnabled && session?.subtitleTrack
          ? "showing"
          : "hidden";
    }
  }, [
    editorSession.state.playback.captionsEnabled,
    editorSession.state.playback.playerMuted,
    session?.subtitleTrack,
  ]);

  function pausePreview() {
    videoRef.current?.pause();
  }

  function seekPreview(time) {
    const video = videoRef.current;
    const nextTime = clampHead(time, selection.startSeconds, selection.endSeconds);

    if (!Number.isFinite(nextTime)) {
      return;
    }

    syncHead(nextTime, true);

    if (!video) {
      return;
    }

    try {
      video.currentTime = nextTime;
    } catch {
      return;
    }
  }

  function handleLoadedMetadata(event) {
    const durationSeconds = Math.max(
      1,
      Math.floor(event.currentTarget.duration || 0),
    );

    editorSession.setSelection({
      durationSeconds,
      endSeconds: selection.endSeconds || durationSeconds,
    });
    syncHead(Math.min(selection.headSeconds, durationSeconds), true);
    seekPreview(selection.startSeconds);
  }

  function handleTimeUpdate(event) {
    const currentTime = event.currentTarget.currentTime;
    liveHeadRef.current = currentTime;

    if (selection.endSeconds && currentTime >= selection.endSeconds) {
      event.currentTarget.pause();
      seekPreview(selection.endSeconds);
      editorSession.setPlaying(false);
      return;
    }

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const delta = Math.abs(currentTime - lastCommittedHeadRef.current);

    if (delta < 0.1 && now - lastCommitAtRef.current < 120) {
      return;
    }

    syncHead(currentTime);
  }

  function toggleMute() {
    editorSession.setPlayback({
      playerMuted: !editorSession.state.playback.playerMuted,
    });
  }

  function toggleCaptions() {
    if (!session?.subtitleTrack?.assetUrl) {
      editorSession.setExportStatus("This source does not include a preview captions track.");
      return;
    }

    editorSession.setPlayback({
      captionsEnabled: !editorSession.state.playback.captionsEnabled,
    });
  }

  async function openFullscreen() {
    const target = stageRef.current;

    if (!target?.requestFullscreen) {
      editorSession.setSourceStatus("Fullscreen is not supported in this browser.");
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
      editorSession.setSourceStatus("Fullscreen could not be opened.");
      pushToast(
        "Fullscreen failed",
        "The player could not enter fullscreen mode.",
        "warning",
      );
    }
  }

  async function togglePlayback() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (editorSession.state.playing) {
      pausePreview();
      editorSession.setPlaying(false);
      return;
    }

    if (
      video.currentTime < selection.startSeconds ||
      video.currentTime >= selection.endSeconds
    ) {
      seekPreview(selection.startSeconds);
    }

    try {
      await video.play();
      editorSession.setPlaying(true);
    } catch (error) {
      editorSession.setSourceStatus("Preview playback could not start.");
      pushToast(
        "Playback failed",
        getErrorMessage(error, "The preview could not start playing."),
        "warning",
      );
    }
  }

  async function previewRange() {
    if (!session) {
      return;
    }

    seekPreview(selection.startSeconds);

    try {
      await videoRef.current?.play();
      editorSession.setPlaying(true);
    } catch (error) {
      editorSession.setSourceStatus("Preview playback could not start.");
      pushToast(
        "Playback failed",
        getErrorMessage(error, "The preview could not start playing."),
        "warning",
      );
    }
  }

  function onPause() {
    syncHead(videoRef.current?.currentTime ?? liveHeadRef.current, true);
    editorSession.setPlaying(false);
  }

  function onPlay() {
    editorSession.setPlaying(true);
  }

  return {
    stageRef,
    videoRef,
    session,
    selection,
    headSeconds,
    playing: editorSession.state.playing,
    playerMuted: editorSession.state.playback.playerMuted,
    captionsEnabled: editorSession.state.playback.captionsEnabled,
    pausePreview,
    seekPreview,
    previewRange,
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: handleTimeUpdate,
    onPause,
    onPlay,
    onTogglePlayback: togglePlayback,
    onToggleMute: toggleMute,
    onToggleCaptions: toggleCaptions,
    onFullscreen: openFullscreen,
  };

  function syncHead(time, force = false) {
    const safeTime = clampHead(time, selection.startSeconds, selection.endSeconds);

    if (!Number.isFinite(safeTime)) {
      return;
    }

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const delta = Math.abs(safeTime - lastCommittedHeadRef.current);

    if (!force && delta < 0.1 && now - lastCommitAtRef.current < 120) {
      return;
    }

    liveHeadRef.current = safeTime;
    lastCommittedHeadRef.current = safeTime;
    lastCommitAtRef.current = now;

    setHeadSeconds((current) => {
      if (Math.abs(current - safeTime) < 0.01) {
        return current;
      }

      return safeTime;
    });
  }
}

function clampHead(value, startSeconds, endSeconds) {
  const safeStart = Math.max(0, Number(startSeconds) || 0);
  const safeEnd = Math.max(safeStart, Number(endSeconds) || safeStart);

  return Math.min(Math.max(Number(value) || 0, safeStart), safeEnd);
}
