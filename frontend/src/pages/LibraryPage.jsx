import { AlertTriangle, FolderSearch, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import HistoryList from "../features/library/components/HistoryList";
import PageShell from "../layouts/PageShell";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import SectionHeader from "../components/shared/SectionHeader";
import MagicBento from "../components/ui/MagicBento";
import { Button } from "../components/ui/button";
import { useLibraryActions } from "../features/library/hooks/useLibraryActions";
import { useLibraryStore } from "../state/library/LibraryProvider";

export default function LibraryPage() {
  const navigate = useNavigate();
  const { state, ensureLibraryLoaded } = useLibraryStore();
  const {
    items,
    refreshLibrary,
    clearHistory,
    reopenHistory,
    deleteHistory,
    copyShareLink,
  } = useLibraryActions();
  const [confirmState, setConfirmState] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const hasItems = items.length > 0;
  const showLoadingState = (!state.hasLoaded || state.loading) && !hasItems && !state.error;
  const showEmptyState = state.hasLoaded && !state.loading && !state.error && !hasItems;

  useEffect(() => {
    void ensureLibraryLoaded();
  }, [ensureLibraryLoaded]);

  async function confirmDestructiveAction() {
    if (!confirmState) {
      return;
    }

    setConfirmBusy(true);

    try {
      if (confirmState.type === "clear") {
        await clearHistory();
      } else if (confirmState.type === "delete" && confirmState.entry) {
        await deleteHistory(confirmState.entry);
      }
    } finally {
      setConfirmBusy(false);
      setConfirmState(null);
    }
  }

  return (
    <PageShell>
      <MagicBento className="px-6 py-6 sm:px-7" contentClassName="space-y-5">
        <SectionHeader
          actions={
            <>
              <Button disabled={state.loading} onClick={refreshLibrary} type="button" variant="secondary">
                {state.loading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                disabled={!hasItems || confirmBusy}
                onClick={() =>
                  setConfirmState({
                    type: "clear",
                    title: "Clear the entire library?",
                    description:
                      "This removes every saved draft and export from this workspace. This cannot be undone.",
                    confirmLabel: "Clear library",
                    confirmBusyLabel: "Clearing...",
                  })
                }
                type="button"
                variant="danger"
              >
                Clear Library
              </Button>
            </>
          }
          description="Reopen a draft, copy a share link, or download a finished export."
          eyebrow="Saved clips"
          title="Library"
        />

        {state.error ? (
          <MagicBento className="px-5 py-5 sm:px-6" contentClassName="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-500/12 text-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">
                  Library unavailable
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  {state.error}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={refreshLibrary} type="button" variant="secondary">
                Try Again
              </Button>
              <Button onClick={() => navigate("/editor")} type="button" variant="ghost">
                Open Editor
              </Button>
            </div>
          </MagicBento>
        ) : null}

        {showLoadingState ? (
          <MagicBento className="px-5 py-5 sm:px-6" contentClassName="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/12 text-cyan-100">
                <LoaderCircle className="h-5 w-5 animate-spin" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">
                  Loading saved clips
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  ClipRange is checking your recent drafts and finished exports.
                </p>
              </div>
            </div>
          </MagicBento>
        ) : null}

        {showEmptyState ? (
          <MagicBento className="px-5 py-5 sm:px-6" contentClassName="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-100">
                <FolderSearch className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">
                  No saved clips yet
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  Drafts and finished exports will appear here after you trim a source and send it out of the editor.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/editor")} type="button" variant="primary">
                Open Editor
              </Button>
              <Button onClick={refreshLibrary} type="button" variant="secondary">
                Refresh
              </Button>
            </div>
          </MagicBento>
        ) : null}

        {hasItems ? (
          <HistoryList
            items={items}
            emptyMessage="Exports and drafts will appear here."
            onReopen={reopenHistory}
            onDelete={(entry) =>
              setConfirmState({
                type: "delete",
                entry,
                title: `Delete "${entry.title}"?`,
                description:
                  "This permanently removes the selected draft or export from your library.",
                confirmLabel: "Delete item",
                confirmBusyLabel: "Deleting...",
              })
            }
            onCopyShare={copyShareLink}
          />
        ) : null}
      </MagicBento>

      <ConfirmDialog
        busy={confirmBusy}
        cancelLabel="Cancel"
        confirmBusyLabel={confirmState?.confirmBusyLabel}
        confirmLabel={confirmState?.confirmLabel}
        description={confirmState?.description}
        onClose={() => {
          if (!confirmBusy) {
            setConfirmState(null);
          }
        }}
        onConfirm={confirmDestructiveAction}
        open={Boolean(confirmState)}
        title={confirmState?.title}
      />
    </PageShell>
  );
}
