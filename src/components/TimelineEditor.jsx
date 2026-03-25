import { Clock3, RotateCcw, Scissors, SkipBack, SkipForward, Wand2 } from "lucide-react";

import { formatClipLength, formatClock } from "../lib/cliprange";
import TrimRangeSlider from "./TrimRangeSlider";
import MagicBento from "./ui/MagicBento";
import { Button } from "./ui/button";

export default function TimelineEditor({
  retrievedVideo,
  editor,
  startDraft,
  endDraft,
  startPct,
  endPct,
  headPct,
  onStartChange,
  onEndChange,
  onHeadChange,
  onStartDraftChange,
  onEndDraftChange,
  onCommitDraft,
  onSetBoundary,
  onShiftSelection,
  onResetSelection,
  onPreviewRange,
}) {
  return (
    <MagicBento as="section" className="px-5 py-5 sm:px-6" contentClassName="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
            Selection Range
          </span>
          <strong className="block text-xl font-semibold tracking-[-0.05em] text-white">
            {`${formatClock(editor.start)} - ${formatClock(editor.end)}`}
          </strong>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Start</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatClock(editor.start)}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">End</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatClock(editor.end)}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Length</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatClipLength(editor.end - editor.start)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Trim controls">
        <Button disabled={!retrievedVideo} onClick={onPreviewRange} type="button" variant="secondary">
          <Scissors className="h-4 w-4" />
          Preview Range
        </Button>
        <Button disabled={!retrievedVideo} onClick={onResetSelection} type="button" variant="secondary">
          <RotateCcw className="h-4 w-4" />
          Reset Range
        </Button>
      </div>

      <TrimRangeSlider
        disabled={!retrievedVideo}
        duration={editor.duration}
        end={editor.end}
        endPct={endPct}
        head={editor.head}
        headPct={headPct}
        start={editor.start}
        startPct={startPct}
        onEndChange={onEndChange}
        onHeadChange={onHeadChange}
        onStartChange={onStartChange}
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,300px)]">
        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 lg:col-span-2 xl:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-violet-200" />
            <label className="text-sm font-semibold text-white" htmlFor="clip-start-input">
              Start Time
            </label>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <button
              aria-label="Subtract 5 seconds from start time"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              disabled={!retrievedVideo}
              onClick={() => onStartChange(editor.start - 5)}
              type="button"
            >
              -
            </button>
            <input
              autoComplete="off"
              className="h-11 min-w-0 flex-1 w-full rounded-2xl border border-white/10 bg-[#060816] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50 focus:ring-2 focus:ring-violet-400/20"
              disabled={!retrievedVideo}
              id="clip-start-input"
              inputMode="numeric"
              onBlur={() => onCommitDraft("start")}
              onChange={(event) => onStartDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCommitDraft("start");
                }
              }}
              type="text"
              value={startDraft}
            />
            <button
              aria-label="Add 5 seconds to start time"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              disabled={!retrievedVideo}
              onClick={() => onStartChange(editor.start + 5)}
              type="button"
            >
              +
            </button>
          </div>
          <Button
            className="mt-3 w-full"
            disabled={!retrievedVideo}
            onClick={() => onSetBoundary("start")}
            type="button"
            variant="ghost"
          >
            Set Start
          </Button>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-sky-200" />
            <label className="text-sm font-semibold text-white" htmlFor="clip-end-input">
              End Time
            </label>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <button
              aria-label="Subtract 5 seconds from end time"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              disabled={!retrievedVideo}
              onClick={() => onEndChange(editor.end - 5)}
              type="button"
            >
              -
            </button>
            <input
              autoComplete="off"
              className="h-11 min-w-0 flex-1 w-full rounded-2xl border border-white/10 bg-[#060816] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50 focus:ring-2 focus:ring-violet-400/20"
              disabled={!retrievedVideo}
              id="clip-end-input"
              inputMode="numeric"
              onBlur={() => onCommitDraft("end")}
              onChange={(event) => onEndDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCommitDraft("end");
                }
              }}
              type="text"
              value={endDraft}
            />
            <button
              aria-label="Add 5 seconds to end time"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              disabled={!retrievedVideo}
              onClick={() => onEndChange(editor.end + 5)}
              type="button"
            >
              +
            </button>
          </div>
          <Button
            className="mt-3 w-full"
            disabled={!retrievedVideo}
            onClick={() => onSetBoundary("end")}
            type="button"
            variant="ghost"
          >
            Set End
          </Button>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="mb-4 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-amber-200" />
            <p className="text-sm font-semibold text-white">Adjustment</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button disabled={!retrievedVideo} onClick={() => onShiftSelection(-10)} type="button" variant="secondary">
              <SkipBack className="h-4 w-4" />
              -10s
            </Button>
            <Button disabled={!retrievedVideo} onClick={() => onShiftSelection(10)} type="button" variant="secondary">
              <SkipForward className="h-4 w-4" />
              +10s
            </Button>
            <Button disabled={!retrievedVideo} onClick={onResetSelection} type="button" variant="ghost">
              Reset
            </Button>
          </div>
          <span className="mt-4 block text-xs uppercase tracking-[0.18em] text-slate-400">
            {`Clip length: ${formatClipLength(editor.end - editor.start)}`}
          </span>
        </div>
      </div>
    </MagicBento>
  );
}
