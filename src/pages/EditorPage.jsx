import ClipSettings from "../components/ClipSettings";
import PageShell from "../components/PageShell";
import PreviewStage from "../components/PreviewStage";
import SourceBar from "../components/SourceBar";
import TimelineEditor from "../components/TimelineEditor";
import { useAppShellContext } from "../lib/app-shell-context";

export default function EditorPage() {
  const {
    editor,
    output,
    retrievedVideo,
    latestExport,
    playerMuted,
    captionsEnabled,
    retrievingPreview,
    retrieveProgress,
    exporting,
    exportProgress,
    sourceStatus,
    exportStatus,
    startDraft,
    endDraft,
    startPct,
    endPct,
    headPct,
    stageRef,
    videoRef,
    onSubmit,
    onUrlChange,
    onPaste,
    onClear,
    onLoadedMetadata,
    onTimeUpdate,
    onPause,
    onPlay,
    onTogglePlayback,
    onToggleMute,
    onToggleCaptions,
    onFullscreen,
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
    onModeChange,
    onWatermarkChange,
    onSubtitlesChange,
    onTitleChange,
    onReopenHistory,
    onCopyShare,
    onExport,
  } = useAppShellContext();

  return (
    <PageShell>
      <div className="grid gap-5">
        <SourceBar
          url={editor.url}
          retrievingPreview={retrievingPreview}
          retrieveProgress={retrieveProgress}
          sourceStatus={sourceStatus}
          onSubmit={onSubmit}
          onUrlChange={onUrlChange}
          onPaste={onPaste}
          onClear={onClear}
        />

        <section
          className="grid gap-5 lg:grid-cols-[minmax(0,65%)_minmax(320px,35%)]"
          aria-label="Editor layout"
        >
          <main
            className="grid min-w-0 gap-5"
            aria-label="Clip editor workspace"
          >
            <PreviewStage
              stageRef={stageRef}
              videoRef={videoRef}
              retrievedVideo={retrievedVideo}
              editor={editor}
              playerMuted={playerMuted}
              captionsEnabled={captionsEnabled}
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onPause={onPause}
              onPlay={onPlay}
              onTogglePlayback={onTogglePlayback}
              onToggleMute={onToggleMute}
              onToggleCaptions={onToggleCaptions}
              onFullscreen={onFullscreen}
            />

            <TimelineEditor
              retrievedVideo={retrievedVideo}
              editor={editor}
              startDraft={startDraft}
              endDraft={endDraft}
              startPct={startPct}
              endPct={endPct}
              headPct={headPct}
              onStartChange={onStartChange}
              onEndChange={onEndChange}
              onHeadChange={onHeadChange}
              onStartDraftChange={onStartDraftChange}
              onEndDraftChange={onEndDraftChange}
              onCommitDraft={onCommitDraft}
              onSetBoundary={onSetBoundary}
              onShiftSelection={onShiftSelection}
              onResetSelection={onResetSelection}
              onPreviewRange={onPreviewRange}
            />
          </main>

          <aside
            className="min-w-0 self-start lg:sticky lg:top-28"
            aria-label="Clip configuration sidebar"
          >
            <ClipSettings
              editor={editor}
              output={output}
              exporting={exporting}
              exportProgress={exportProgress}
              exportStatus={exportStatus}
              latestExport={latestExport}
              onModeChange={onModeChange}
              onWatermarkChange={onWatermarkChange}
              onSubtitlesChange={onSubtitlesChange}
              onTitleChange={onTitleChange}
              onReopenHistory={onReopenHistory}
              onCopyShare={onCopyShare}
              onExport={onExport}
            />
          </aside>
        </section>
      </div>
    </PageShell>
  );
}
