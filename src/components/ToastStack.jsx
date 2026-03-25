import { cn } from "../lib/utils";
import MagicBento from "./ui/MagicBento";

const toneClasses = {
  info: "border-violet-400/25",
  success: "border-emerald-400/25",
  warning: "border-amber-400/25",
};

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div aria-atomic="true" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <MagicBento
          key={toast.id}
          as="article"
          className={cn("pointer-events-auto px-4 py-4", toneClasses[toast.tone] ?? toneClasses.info)}
          enableMagnetism={false}
          enableTilt={false}
          particleCount={8}
          spotlightRadius={280}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <strong className="block text-sm font-semibold tracking-[-0.02em] text-white">{toast.title}</strong>
              {toast.detail ? <span className="block text-xs leading-5 text-slate-300">{toast.detail}</span> : null}
            </div>
            <button
              className="rounded-xl border border-white/10 bg-white/6 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
              onClick={() => onDismiss(toast.id)}
              type="button"
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        </MagicBento>
      ))}
    </div>
  );
}
