import { useEffect, useEffectEvent } from "react";

import { formatClock } from "../../../utils/cliprange";
import { useToast } from "../../../state/ui/ToastProvider";

export function useTimelineShortcuts({
  hasSession,
  headSeconds,
  disabled = false,
  onTogglePlayback,
  onToggleMute,
  onToggleCaptions,
  onFullscreen,
  onHeadChange,
  onSetBoundary,
  onShiftSelection,
}) {
  const { pushToast } = useToast();

  const handleKeyDown = useEffectEvent((event) => {
    const isTypingTarget = (target) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );
    };

    if (
      disabled ||
      !hasSession ||
      isTypingTarget(event.target) ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === " " || key === "k") {
      event.preventDefault();
      void onTogglePlayback();
      return;
    }

    if (key === "j") {
      event.preventDefault();
      onHeadChange(headSeconds - 5);
      return;
    }

    if (key === "l") {
      event.preventDefault();
      onHeadChange(headSeconds + 5);
      return;
    }

    if (key === "i") {
      event.preventDefault();
      onSetBoundary("start");
      pushToast(
        "Start trimmed",
        `New start: ${formatClock(headSeconds)}`,
        "info",
      );
      return;
    }

    if (key === "o") {
      event.preventDefault();
      onSetBoundary("end");
      pushToast(
        "End trimmed",
        `New end: ${formatClock(headSeconds)}`,
        "info",
      );
      return;
    }

    if (key === "m") {
      event.preventDefault();
      onToggleMute();
      return;
    }

    if (key === "c") {
      event.preventDefault();
      onToggleCaptions();
      return;
    }

    if (key === "f") {
      event.preventDefault();
      void onFullscreen();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (event.shiftKey) {
        onShiftSelection(-1);
      } else {
        onHeadChange(headSeconds - 0.5);
      }
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (event.shiftKey) {
        onShiftSelection(1);
      } else {
        onHeadChange(headSeconds + 0.5);
      }
    }
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      handleKeyDown(event);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
