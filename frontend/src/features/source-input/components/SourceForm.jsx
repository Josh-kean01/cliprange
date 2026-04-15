import { ChevronDown, Link2, Sparkles } from "lucide-react";

import StatusProgress from "../../../components/shared/StatusProgress";
import MagicBento from "../../../components/ui/MagicBento";
import { Button } from "../../../components/ui/button";
import { RETRIEVE_QUALITY_OPTIONS } from "../../../utils/retrieve-quality";

export default function SourceForm({
  url,
  quality,
  retrievingPreview,
  retrieveProgress,
  sourceStatus,
  onSubmit,
  onUrlChange,
  onQualityChange,
  onPaste,
  onClear,
}) {
  return (
    <MagicBento
      as="form"
      className="px-5 py-5 sm:px-6 sm:py-6"
      contentClassName="space-y-5"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <span className="section-eyebrow">
            <Sparkles className="h-3.5 w-3.5" />
            Retrieve Source
          </span>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-[-0.05em] text-white sm:text-2xl">
              Load a local editable preview
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Paste a YouTube URL, retrieve the source locally, and get straight
              into trimming without leaving the editor.
            </p>
          </div>
        </div>

        <div className="surface-chip px-3 py-2 text-xs normal-case tracking-normal text-slate-300">
          <Link2 className="h-3.5 w-3.5" />
          <span>Supports YouTube videos and Shorts</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,250px)_auto]">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Source URL
          </span>
          <input
            className="surface-input h-14"
            type="url"
            placeholder="Paste YouTube URL..."
            autoComplete="off"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Source quality
          </span>
          <div className="relative">
            <select
              className="surface-input h-14 appearance-none pr-14"
              disabled={retrievingPreview}
              value={quality}
              onChange={(event) => onQualityChange(event.target.value)}
            >
              {RETRIEVE_QUALITY_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </span>
          </div>
        </label>

        <Button
          className="space-y-2 lg:self-end h-14"
          disabled={retrievingPreview}
          type="submit"
          variant="primary"
        >
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
          <StatusProgress
            active={retrievingPreview}
            align="source"
            message={sourceStatus}
            progress={retrieveProgress}
          />
        </div>
      </div>
    </MagicBento>
  );
}
