import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useId, useRef } from "react";

import { useAccessibleDialog } from "../../hooks/useAccessibleDialog";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmBusyLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useAccessibleDialog({
    open,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
  });

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-[#03040c]/78 backdrop-blur-sm"
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
        <section
          aria-describedby={description ? descriptionId : undefined}
          aria-labelledby={titleId}
          aria-modal="true"
          className="surface-dialog w-full max-w-lg p-5 sm:p-6"
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-card border",
                tone === "danger"
                  ? "border-[color:var(--danger-border)] bg-[var(--danger-surface)] text-[color:var(--danger-ink)]"
                  : "border-[color:var(--warning-border)] bg-[var(--warning-surface)] text-[color:var(--warning-ink)]",
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1 space-y-2">
              <h2
                className="text-xl font-semibold tracking-[-0.04em] text-white"
                id={titleId}
              >
                {title}
              </h2>
              {description ? (
                <p
                  className="text-sm leading-6 text-slate-300"
                  id={descriptionId}
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              disabled={busy}
              onClick={onClose}
              ref={cancelButtonRef}
              type="button"
              variant="secondary"
            >
              {cancelLabel}
            </Button>
            <Button
              disabled={busy}
              onClick={onConfirm}
              type="button"
              variant={tone === "danger" ? "danger" : "primary"}
            >
              {busy ? confirmBusyLabel ?? confirmLabel : confirmLabel}
            </Button>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
