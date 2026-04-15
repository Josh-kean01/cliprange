import PreviewPlayer from "../../preview/components/PreviewPlayer";
import { usePreviewController } from "../../preview/hooks/usePreviewController";
import TimelineEditor from "../../timeline/components/TimelineEditor";
import { useTimelineController } from "../../timeline/hooks/useTimelineController";
import { useTimelineShortcuts } from "../../timeline/hooks/useTimelineShortcuts";
import { useEditorSession } from "../hooks/useEditorSession";

export default function EditorWorkspace({
  shortcutsDisabled = false,
  onOpenVideoDetails,
  videoDetailsEnabled = false,
}) {
  const editorSession = useEditorSession();
  const previewController = usePreviewController();
  const timelineController = useTimelineController(previewController);
  const session = editorSession.state.session;
  const editor = {
    duration: editorSession.state.selection.durationSeconds,
    start: editorSession.state.selection.startSeconds,
    end: editorSession.state.selection.endSeconds,
    head: previewController.headSeconds,
    playing: editorSession.state.playing,
  };
  const retrievedVideo = session
    ? {
        sessionId: session.sessionId,
        sourceUrl: session.source.sourceUrl,
        sourceKind: session.source.sourceKind,
        requestedQuality: session.source.requestedQuality,
        retrievedQuality: session.source.retrievedQuality,
        assetUrl: session.preview.assetUrl,
        thumbnailUrl: session.preview.posterUrl || session.thumbnailUrl,
        title: session.title,
        meta: session.metaSummary,
        subtitleUrl: session.subtitleTrack?.assetUrl ?? "",
        tags: session.tags,
      }
    : null;

  useTimelineShortcuts({
    hasSession: Boolean(session),
    headSeconds: previewController.headSeconds,
    disabled: shortcutsDisabled,
    onTogglePlayback: previewController.onTogglePlayback,
    onToggleMute: previewController.onToggleMute,
    onToggleCaptions: previewController.onToggleCaptions,
    onFullscreen: previewController.onFullscreen,
    onHeadChange: timelineController.onHeadChange,
    onSetBoundary: timelineController.onSetBoundary,
    onShiftSelection: timelineController.onShiftSelection,
  });

  return (
    <main
      className="grid min-w-0 gap-5"
      aria-label="Clip editor workspace"
    >
      <PreviewPlayer
        stageRef={previewController.stageRef}
        videoRef={previewController.videoRef}
        retrievedVideo={retrievedVideo}
        editor={editor}
        playerMuted={previewController.playerMuted}
        captionsEnabled={previewController.captionsEnabled}
        onLoadedMetadata={previewController.onLoadedMetadata}
        onTimeUpdate={previewController.onTimeUpdate}
        onPause={previewController.onPause}
        onPlay={previewController.onPlay}
        onTogglePlayback={previewController.onTogglePlayback}
        onToggleMute={previewController.onToggleMute}
        onToggleCaptions={previewController.onToggleCaptions}
        onFullscreen={previewController.onFullscreen}
        onOpenVideoDetails={onOpenVideoDetails}
        videoDetailsEnabled={videoDetailsEnabled}
      />

      <TimelineEditor
        retrievedVideo={retrievedVideo}
        editor={editor}
        startDraft={timelineController.startDraft}
        endDraft={timelineController.endDraft}
        startPct={timelineController.startPct}
        endPct={timelineController.endPct}
        headPct={timelineController.headPct}
        onStartChange={timelineController.onStartChange}
        onEndChange={timelineController.onEndChange}
        onHeadChange={timelineController.onHeadChange}
        onStartDraftChange={timelineController.onStartDraftChange}
        onEndDraftChange={timelineController.onEndDraftChange}
        onCommitDraft={timelineController.onCommitDraft}
        onSetBoundary={timelineController.onSetBoundary}
        onShiftSelection={timelineController.onShiftSelection}
        onResetSelection={timelineController.onResetSelection}
        onPreviewRange={previewController.previewRange}
      />
    </main>
  );
}
