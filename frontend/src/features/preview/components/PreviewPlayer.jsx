import { Captions, CaptionsOff, Expand, FileText, Pause, Play, Volume2, VolumeX } from "lucide-react";

import { formatPreviewClock } from "../../../utils/cliprange";
import { describeLoadedQuality } from "../../../utils/retrieve-quality";
import MagicBento from "../../../components/ui/MagicBento";
import { Button } from "../../../components/ui/button";

export default function PreviewPlayer({
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
  onOpenVideoDetails,
  videoDetailsEnabled,
}) {
  const isShort = retrievedVideo?.sourceKind === "short";
  const captionsAvailable = Boolean(retrievedVideo?.subtitleUrl);
  const requestedQuality = retrievedVideo?.requestedQuality ?? null;
  const retrievedQuality = retrievedVideo?.retrievedQuality ?? null;
  const qualitySummary = describeLoadedQuality(requestedQuality, retrievedQuality);

  return (
    <MagicBento
      as="section"
      className="px-5 py-5 sm:px-6"
      contentClassName="space-y-5"
      data-preview-section="true"
      enableSpotlight={false}
      enableTilt={false}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Preview Stage</span>
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-white">Editable preview</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {retrievedVideo ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs uppercase  text-cyan-100">
              {isShort ? "Short" : "Video"}
            </span>
          ) : null}
          {requestedQuality ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300">
              {requestedQuality.label} target
            </span>
          ) : null}
          {retrievedQuality ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100">
              {retrievedQuality.label} loaded
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300">
            {retrievedVideo ? "Local source loaded" : "Waiting for source"}
          </span>
        </div>
      </div>

      {retrievedVideo ? (
        <>
          <div className="scroll-mt-28 overflow-hidden rounded-[26px] border border-white/10 bg-black/30" ref={stageRef}>
            <div
              className={
                isShort
                  ? "mx-auto w-full max-w-[405px] bg-black"
                  : "w-full bg-black"
              }
            >
              <div className={isShort ? "aspect-[9/16] w-full bg-black" : "aspect-video w-full bg-black"}>
                <video
                  className={`preview-stage__video h-full w-full ${isShort ? "object-contain" : "object-cover"}`}
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
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="surface-chip surface-chip--accent">
                  Ready
                </span>
                {retrievedVideo.subtitleUrl ? (
                  <span className="surface-chip surface-chip--success">
                    Captions available
                  </span>
                ) : (
                  <span className="surface-chip">
                    No captions track
                  </span>
                )}
                {retrievedQuality?.isFallback ? (
                  <span className="surface-chip surface-chip--warning">
                    Best available under target
                  </span>
                ) : null}
                <Button
                  disabled={!videoDetailsEnabled}
                  onClick={onOpenVideoDetails}
                  size="sm"
                  title={
                    videoDetailsEnabled
                      ? "Open retrieved source metadata"
                      : "Retrieve a source to inspect its metadata"
                  }
                  type="button"
                  variant="secondary"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Video Details
                </Button>
              </div>
              <div className="space-y-1.5">
                <strong className="block text-lg font-semibold tracking-[-0.04em] text-white">{retrievedVideo.title}</strong>
                <p className="text-sm leading-6 text-slate-300">{retrievedVideo.meta}</p>
                {qualitySummary ? (
                  <p className="text-xs leading-5 text-slate-400">{qualitySummary}</p>
                ) : null}
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
                aria-label={captionsAvailable ? "Toggle captions" : "Captions unavailable"}
                className="px-3"
                disabled={!captionsAvailable}
                onClick={onToggleCaptions}
                title={captionsAvailable ? "Toggle captions" : "This source does not include a captions track"}
                type="button"
                variant="secondary"
              >
                {captionsEnabled ? <Captions className="h-4 w-4" /> : <CaptionsOff className="h-4 w-4" />}
                <span className="hidden sm:inline">{captionsAvailable ? "CC" : "No CC"}</span>
              </Button>
              <Button aria-label="Fullscreen" className="px-3" onClick={onFullscreen} type="button" variant="secondary">
                <Expand className="h-4 w-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
            </div>
          </div>

          <div className="surface-panel--inset flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex min-h-[420px] flex-col justify-center rounded-[26px] border border-dashed border-white/12 bg-black/20 px-6 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <span className="section-eyebrow section-eyebrow--neutral py-1">
              Step 1
            </span>
            <div className="mt-4 space-y-3">
              <strong className="block text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">Your editable preview will land here</strong>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-300">
                Start with a YouTube link in the retrieve form above. Once the source is cached locally, ClipRange will
                load the preview stage, reveal the trim handles, and unlock export actions only when the clip is ready.
              </p>
            </div>

            <div className="mt-6 grid w-full gap-3 text-left sm:grid-cols-3">
              <EmptyStateStep
                title="Paste the source"
                description="Add the video or Shorts URL you want to clip."
              />
              <EmptyStateStep
                title="Retrieve locally"
                description="Bring the preview into the editor before making trim decisions."
              />
              <EmptyStateStep
                title="Trim and export"
                description="Set the range, preview the moment, then ship it out cleanly."
              />
            </div>
          </div>
        </div>
      )}
    </MagicBento>
  );
}

function EmptyStateStep({ description, title }) {
  return (
    <div className="surface-panel px-4 py-4">
      <p className="text-sm font-semibold tracking-[-0.02em] text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
