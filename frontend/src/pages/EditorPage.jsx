import { lazy, Suspense, useEffect, useState } from "react";

import EditorWorkspace from "../features/editor-session/components/EditorWorkspace";
import ExportPanel from "../features/export/components/ExportPanel";
import PageShell from "../layouts/PageShell";
import { useEditorSession } from "../features/editor-session/hooks/useEditorSession";
import { useExportWorkflow } from "../features/export/hooks/useExportWorkflow";
import { useLibraryActions } from "../features/library/hooks/useLibraryActions";
import SourceForm from "../features/source-input/components/SourceForm";
import { useRetrieveSource } from "../features/source-input/hooks/useRetrieveSource";

const VideoDetailsModal = lazy(() => import("../features/export/components/VideoDetailsModal"));

export default function EditorPage() {
  const editorSession = useEditorSession();
  const sourceInput = useRetrieveSource();
  const exportWorkflow = useExportWorkflow();
  const libraryActions = useLibraryActions();
  const [videoDetailsOpen, setVideoDetailsOpen] = useState(false);

  const session = editorSession.state.session;
  const editor = {
    mode: editorSession.state.outputMode,
    title: editorSession.state.title,
  };
  const output = editorSession.state.outputOptions;
  const canOpenVideoDetails = Boolean(session?.sessionId);
  const hasValidSelection =
    editorSession.state.selection.endSeconds >
    editorSession.state.selection.startSeconds;
  const canExport = Boolean(session?.sessionId) && hasValidSelection;
  const exportDisabledReason = !session?.sessionId
    ? "Retrieve a source to enable export."
    : "Set an end time that is later than the start time.";
  const latestHistoryEntry = exportWorkflow.latestResult?.historyEntry ?? null;
  const latestExport = latestHistoryEntry
    ? {
        ...latestHistoryEntry,
        clipId: latestHistoryEntry.entryId,
        duration: latestHistoryEntry.selection.durationSeconds,
        start: latestHistoryEntry.selection.startSeconds,
        end: latestHistoryEntry.selection.endSeconds,
        removeWatermark: latestHistoryEntry.options.removeWatermark,
        autoSubtitles: latestHistoryEntry.options.autoSubtitles,
      }
    : null;

  useEffect(() => {
    if (!session?.sessionId) {
      setVideoDetailsOpen(false);
    }
  }, [session?.sessionId]);

  return (
    <PageShell>
      <>
        <div className="grid gap-5">
          <SourceForm
            url={sourceInput.url}
            quality={sourceInput.quality}
            retrievingPreview={sourceInput.retrievingPreview}
            retrieveProgress={sourceInput.retrieveProgress}
            sourceStatus={sourceInput.sourceStatus}
            onSubmit={sourceInput.onSubmit}
            onUrlChange={sourceInput.onUrlChange}
            onQualityChange={sourceInput.onQualityChange}
            onPaste={sourceInput.onPaste}
            onClear={sourceInput.onClear}
          />

          <section
            className="grid gap-5 lg:grid-cols-[minmax(0,65%)_minmax(320px,35%)]"
            aria-label="Editor layout"
          >
            <EditorWorkspace
              shortcutsDisabled={videoDetailsOpen}
              onOpenVideoDetails={() => setVideoDetailsOpen(true)}
              videoDetailsEnabled={canOpenVideoDetails}
            />

            <aside
              className="min-w-0 self-start lg:sticky lg:top-28"
              aria-label="Clip configuration sidebar"
            >
              <ExportPanel
                editor={editor}
                output={output}
                exporting={exportWorkflow.exporting}
                exportProgress={exportWorkflow.exportProgress}
                exportStatus={exportWorkflow.exportStatus}
                latestExport={latestExport}
                onModeChange={editorSession.setOutputMode}
                onWatermarkChange={(value) =>
                  editorSession.setOutputOptions({ removeWatermark: value })
                }
                onSubtitlesChange={(value) =>
                  editorSession.setOutputOptions({ autoSubtitles: value })
                }
                onTitleChange={editorSession.setTitle}
                onReopenHistory={libraryActions.reopenHistory}
                onCopyShare={libraryActions.copyShareLink}
                onExport={exportWorkflow.onExport}
                canExport={canExport}
                exportDisabledReason={exportDisabledReason}
              />
            </aside>
          </section>
        </div>

        {videoDetailsOpen ? (
          <Suspense fallback={null}>
            <VideoDetailsModal
              onClose={() => setVideoDetailsOpen(false)}
              open={videoDetailsOpen}
              session={session}
            />
          </Suspense>
        ) : null}
      </>
    </PageShell>
  );
}
