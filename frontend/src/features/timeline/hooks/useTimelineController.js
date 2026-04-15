import { useEffect, useState } from "react";

import { formatClock, getPercent, parseClock } from "../../../utils/cliprange";
import { useEditorSession } from "../../editor-session/hooks/useEditorSession";

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

export function useTimelineController(previewController) {
  const editorSession = useEditorSession();
  const selection = editorSession.state.selection;
  const headSeconds = previewController.headSeconds;
  const [startDraft, setStartDraft] = useState(formatClock(selection.startSeconds));
  const [endDraft, setEndDraft] = useState(formatClock(selection.endSeconds));

  useEffect(() => {
    setStartDraft(formatClock(selection.startSeconds));
  }, [selection.startSeconds]);

  useEffect(() => {
    setEndDraft(formatClock(selection.endSeconds));
  }, [selection.endSeconds]);

  function handleStartChange(nextStart) {
    if (headSeconds < nextStart) {
      previewController.seekPreview(nextStart);
    }

    editorSession.setSelection({
      startSeconds: nextStart,
    });
  }

  function handleEndChange(nextEnd) {
    if (headSeconds > nextEnd) {
      previewController.seekPreview(nextEnd);
    }

    editorSession.setSelection({
      endSeconds: nextEnd,
    });
  }

  function handleHeadChange(nextHead) {
    previewController.seekPreview(nextHead);
    editorSession.setPlaying(false);
  }

  function commitDraft(kind) {
    const draft = kind === "start" ? startDraft : endDraft;
    const parsed = parseClock(draft);

    if (parsed === null) {
      if (kind === "start") {
        setStartDraft(formatClock(selection.startSeconds));
      } else {
        setEndDraft(formatClock(selection.endSeconds));
      }
      return;
    }

    if (kind === "start") {
      handleStartChange(parsed);
      return;
    }

    handleEndChange(parsed);
  }

  function setBoundaryFromHead(kind) {
    const currentTime =
      previewController.videoRef.current?.currentTime ?? headSeconds;

    if (kind === "start") {
      editorSession.setSelection({
        startSeconds: currentTime,
      });
      return;
    }

    editorSession.setSelection({
      endSeconds: currentTime,
    });
  }

  function shiftSelection(delta) {
    const clipLength = selection.endSeconds - selection.startSeconds;
    const nextStart = clamp(
      selection.startSeconds + delta,
      0,
      Math.max(0, selection.durationSeconds - clipLength),
    );
    const nextEnd = nextStart + clipLength;
    const nextHead = clamp(headSeconds + delta, nextStart, nextEnd);

    editorSession.setSelection({
      startSeconds: nextStart,
      endSeconds: nextEnd,
    });
    previewController.seekPreview(nextHead);
    editorSession.setPlaying(false);
  }

  function resetSelection() {
    previewController.pausePreview();
    previewController.seekPreview(0);
    editorSession.setSelection({
      startSeconds: 0,
      endSeconds: selection.durationSeconds,
    });
    editorSession.setPlaying(false);
  }

  return {
    selection,
    startDraft,
    endDraft,
    startPct: getPercent(selection.startSeconds, selection.durationSeconds),
    endPct: getPercent(selection.endSeconds, selection.durationSeconds),
    headPct: getPercent(headSeconds, selection.durationSeconds),
    onStartChange: handleStartChange,
    onEndChange: handleEndChange,
    onHeadChange: handleHeadChange,
    onStartDraftChange: setStartDraft,
    onEndDraftChange: setEndDraft,
    onCommitDraft: commitDraft,
    onSetBoundary: setBoundaryFromHead,
    onShiftSelection: shiftSelection,
    onResetSelection: resetSelection,
  };
}
