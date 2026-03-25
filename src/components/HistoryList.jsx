import { formatHistoryMeta } from "../lib/cliprange";
import { cn } from "../lib/utils";
import MagicBento from "./ui/MagicBento";
import { Button } from "./ui/button";

export default function HistoryList({ items, emptyMessage, onReopen, onDelete, onCopyShare }) {
  if (!items.length) {
    return (
      <MagicBento className="px-5 py-5 sm:px-6">
        <p className="text-sm leading-6 text-slate-300">{emptyMessage}</p>
      </MagicBento>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((entry) => (
        <MagicBento key={entry.clipId} as="article" className="px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-base font-semibold tracking-[-0.03em] text-white">{entry.title}</strong>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                      entry.kind === "download"
                        ? "border-sky-400/30 bg-sky-400/10 text-sky-100"
                        : entry.kind === "share"
                          ? "border-violet-400/30 bg-violet-400/10 text-violet-100"
                          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
                    )}
                  >
                    {entry.kind}
                  </span>
                </div>
                <span className="text-sm text-slate-400">{formatHistoryMeta(entry)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => onReopen(entry)} size="sm" type="button" variant="secondary">
                  Reopen
                </Button>
                {entry.downloadUrl ? (
                  <Button download={entry.fileName} href={entry.downloadUrl} size="sm" variant="secondary">
                    Download
                  </Button>
                ) : null}
                {entry.shareUrl ? (
                  <Button onClick={() => onCopyShare(entry)} size="sm" type="button" variant="secondary">
                    Copy Share
                  </Button>
                ) : null}
                <Button onClick={() => onDelete(entry)} size="sm" type="button" variant="danger">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </MagicBento>
      ))}
    </div>
  );
}
