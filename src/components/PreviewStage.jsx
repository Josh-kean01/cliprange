import { Captions, CaptionsOff, Expand, Pause, Play, Volume2, VolumeX } from "lucide-react";

import { formatPreviewClock } from "../lib/cliprange";
import MagicBento from "./ui/MagicBento";
import { Button } from "./ui/button";

export default function PreviewStage({
  stageRef,
  videoRef,
  retrievedVideo,
  editor,
  playerMuted,
  captionsEnabled,
  onLoadedMetadata,
  onTimeUpdate,
  onPause,
  onPlay,
  onTogglePlayback,
  onToggleMute,
  onToggleCaptions,
  onFullscreen,
}) {
  return (
    <MagicBento as="section" className="px-5 py-5 sm:px-6" contentClassName="space-y-5" data-preview-section="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Preview Stage</span>
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-white">Editable preview</h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300">
          {retrievedVideo ? "Local source loaded" : "Waiting for source"}
        </span>
      </div>

      {retrievedVideo ? (
        <>
          <div className="scroll-mt-28 overflow-hidden rounded-[26px] border border-white/10 bg-black/30" ref={stageRef}>
            <div className="aspect-video w-full bg-black">
              <video
                className="preview-stage__video h-full w-full object-cover"
                ref={videoRef}
                src={retrievedVideo.assetUrl}
                poster={retrievedVideo.thumbnailUrl}
                preload="metadata"
                playsInline
                muted={playerMuted}
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                onPause={onPause}
                onPlay={onPlay}
              >
                {retrievedVideo.subtitleUrl ? (
                  <track kind="captions" src={retrievedVideo.subtitleUrl} srcLang="en" label="English captions" />
                ) : null}
              </video>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-100">
                  Ready
                </span>
                {retrievedVideo.subtitleUrl ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                    Captions available
                  </span>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <strong className="block text-lg font-semibold tracking-[-0.04em] text-white">{retrievedVideo.title}</strong>
                <p className="text-sm leading-6 text-slate-300">{retrievedVideo.meta}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                aria-label="Toggle preview playback"
                className="min-w-[130px]"
                onClick={onTogglePlayback}
                type="button"
                variant="primary"
              >
                {editor.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {editor.playing ? "Pause" : "Play"}
              </Button>
              <Button
                aria-label="Volume"
                className="px-3"
                onClick={onToggleMute}
                type="button"
                variant="secondary"
              >
                {playerMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span className="hidden sm:inline">{playerMuted ? "Muted" : "Sound"}</span>
              </Button>
              <Button
                aria-label="Captions"
                className="px-3"
                onClick={onToggleCaptions}
                type="button"
                variant="secondary"
              >
                {captionsEnabled ? <Captions className="h-4 w-4" /> : <CaptionsOff className="h-4 w-4" />}
                <span className="hidden sm:inline">CC</span>
              </Button>
              <Button aria-label="Fullscreen" className="px-3" onClick={onFullscreen} type="button" variant="secondary">
                <Expand className="h-4 w-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Current playhead</p>
              <p className="text-lg font-semibold tracking-[-0.03em] text-white">{formatPreviewClock(editor.head, editor.duration)}</p>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-300">
              Use the range tools below to set your exact start and end points, then preview the selected moment before export.
            </p>
          </div>
        </>
      ) : (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/12 bg-black/20 px-6 py-10 text-center">
          <div className="space-y-3">
            <strong className="block text-xl font-semibold tracking-[-0.04em] text-white">Your editable preview will load here</strong>
            <p className="mx-auto max-w-xl text-sm leading-7 text-slate-300">
              Paste a YouTube link above, click Retrieve, and ClipRange will bring a local preview into the editor before trimming.
            </p>
          </div>
        </div>
      )}
    </MagicBento>
  );
}
