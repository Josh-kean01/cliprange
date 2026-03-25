import { Slider } from "@base-ui/react/slider";

import { clamp, formatClock } from "../lib/cliprange";
import { cn } from "../lib/utils";

const THUMBS = [
  {
    ariaLabel: "Clip start position",
    className:
      "border-violet-200/90 bg-violet-400 shadow-[0_0_0_6px_rgba(139,92,246,0.18)] data-[dragging]:shadow-[0_0_0_10px_rgba(139,92,246,0.22)]",
    index: 0,
    key: "start",
    label: "Start position",
  },
  {
    ariaLabel: "Preview position",
    className:
      "h-[1.125rem] w-[1.125rem] border-sky-100/90 bg-sky-300 shadow-[0_0_0_5px_rgba(56,189,248,0.18)] data-[dragging]:shadow-[0_0_0_9px_rgba(56,189,248,0.22)]",
    index: 1,
    key: "head",
    label: "Preview position",
  },
  {
    ariaLabel: "Clip end position",
    className:
      "border-fuchsia-100/90 bg-fuchsia-400 shadow-[0_0_0_6px_rgba(217,70,239,0.18)] data-[dragging]:shadow-[0_0_0_10px_rgba(217,70,239,0.22)]",
    index: 2,
    key: "end",
    label: "End position",
  },
];

export default function TrimRangeSlider({
  disabled,
  duration,
  end,
  endPct,
  head,
  headPct,
  onEndChange,
  onHeadChange,
  onStartChange,
  start,
  startPct,
}) {
  const safeMax = Math.max(duration, 0.1);
  const sliderValues = [start, head, end];

  const handleValueChange = (nextValues, details) => {
    if (!Array.isArray(nextValues)) {
      return;
    }

    const activeThumbIndex = details?.activeThumbIndex;

    if (activeThumbIndex === 0) {
      onStartChange(nextValues[0]);
      return;
    }

    if (activeThumbIndex === 2) {
      onEndChange(nextValues[2]);
      return;
    }

    onHeadChange(clamp(nextValues[1], start, end));
  };

  const positions = {
    end: { pct: endPct, value: formatClock(end) },
    head: { pct: headPct, value: formatClock(head) },
    start: { pct: startPct, value: formatClock(start) },
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {THUMBS.map((thumb) => (
          <div
            key={thumb.key}
            className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-3"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              {thumb.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {positions[thumb.key].pct}
            </p>
            <p className="mt-1 text-xs text-white">
              {positions[thumb.key].value}
            </p>
          </div>
        ))}
      </div>

      <Slider.Root
        aria-label="Clip trim and preview range"
        className="mt-5 space-y-3"
        disabled={disabled}
        max={safeMax}
        min={0}
        step={0.1}
        thumbAlignment="edge"
        thumbCollisionBehavior="push"
        value={sliderValues}
        onValueChange={handleValueChange}
      >
        <Slider.Control className="relative flex h-10 touch-none items-center select-none">
          <Slider.Track className="relative h-2.5 w-full rounded-full bg-white/10">
            <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
            <Slider.Indicator className="rounded-full bg-[linear-gradient(90deg,rgba(129,95,255,0.85),rgba(76,201,240,0.85),rgba(217,70,239,0.85))] shadow-[0_0_24px_rgba(96,165,250,0.24)]" />

            {THUMBS.map((thumb) => (
              <Slider.Thumb
                aria-label={thumb.ariaLabel}
                className={cn(
                  "absolute flex h-5 w-5 items-center justify-center rounded-full border-2 outline-none transition duration-200 ease-out data-[dragging]:scale-110 data-[focused]:scale-110 data-[focused]:ring-4 data-[focused]:ring-white/15",
                  disabled && "cursor-not-allowed opacity-50",
                  thumb.className,
                )}
                index={thumb.index}
                key={thumb.key}
              >
                <span className="block h-1.5 w-1.5 rounded-full bg-white" />
              </Slider.Thumb>
            ))}
          </Slider.Track>
        </Slider.Control>

        <p className="text-xs leading-6 text-slate-400">
          Drag the outer handles to trim the clip and the center handle to move the preview head inside the selected range.
        </p>
      </Slider.Root>
    </div>
  );
}
