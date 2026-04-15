import { useEffect, useEffectEvent, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element instanceof HTMLElement &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

export function useAccessibleDialog({
  open,
  onClose,
  containerRef,
  initialFocusRef,
}) {
  const restoreFocusRef = useRef(null);
  const handleClose = useEffectEvent(() => {
    onClose();
  });

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const restoreTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    restoreFocusRef.current = restoreTarget;
    document.body.style.overflow = "hidden";

    const focusInitialTarget = () => {
      const target =
        initialFocusRef?.current ??
        getFocusableElements(containerRef.current)[0] ??
        containerRef.current;

      target?.focus();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const container = containerRef.current;
      const focusableElements = getFocusableElements(container);

      if (!focusableElements.length) {
        event.preventDefault();
        container?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const containsFocus =
        activeElement instanceof Node && container?.contains(activeElement);

      if (event.shiftKey) {
        if (activeElement === firstElement || !containsFocus) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement || !containsFocus) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const rafId = window.requestAnimationFrame(focusInitialTarget);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);

      const nextFocusTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;

      if (nextFocusTarget?.isConnected) {
        nextFocusTarget.focus();
      }
    };
  }, [containerRef, handleClose, initialFocusRef, open]);
}
