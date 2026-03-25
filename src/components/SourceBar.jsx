import { Link2, Sparkles } from "lucide-react";

import StatusProgress from "./StatusProgress";
import MagicBento from "./ui/MagicBento";
import { Button } from "./ui/button";

export default function SourceBar({
  url,
  retrievingPreview,
  retrieveProgress,
  sourceStatus,
  onSubmit,
  onUrlChange,
  onPaste,
  onClear,
}) {
  return (
    <MagicBento as="form" className="px-5 py-5 sm:px-6 sm:py-6" contentClassName="space-y-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-100">
            <Sparkles className="h-3.5 w-3.5" />
            Retrieve Source
          </span>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-[-0.05em] text-white sm:text-2xl">
              Load a local editable preview
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Paste a YouTube URL, retrieve the source locally, and get straight into trimming without leaving the editor.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-300">
          <Link2 className="h-3.5 w-3.5" />
          <span>Supports standard YouTube links</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Source URL</span>
          <input
            className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50 focus:bg-black/30 focus:ring-2 focus:ring-violet-400/20"
            type="url"
            placeholder="Paste YouTube URL..."
            autoComplete="off"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
          />
        </label>

        <Button className="lg:self-end" disabled={retrievingPreview} type="submit" variant="primary">
          {retrievingPreview ? `Retrieve ${retrieveProgress}%` : "Retrieve"}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onPaste} type="button" variant="ghost">
            Paste
          </Button>
          <Button onClick={onClear} type="button" variant="ghost">
            Clear
          </Button>
        </div>
        <div className="w-full max-w-xl">
          <StatusProgress active={retrievingPreview} align="source" message={sourceStatus} progress={retrieveProgress} />
        </div>
      </div>
    </MagicBento>
  );
}
