import HistoryList from "../components/HistoryList";
import PageShell from "../components/PageShell";
import SectionHeader from "../components/SectionHeader";
import MagicBento from "../components/ui/MagicBento";
import { Button } from "../components/ui/button";
import { useAppShellContext } from "../lib/app-shell-context";

export default function LibraryPage() {
  const { exportHistory, onRefreshHistory, onClearHistory, onReopenHistory, onDeleteHistory, onCopyShare } =
    useAppShellContext();

  return (
    <PageShell>
      <MagicBento className="px-6 py-6 sm:px-7" contentClassName="space-y-5">
        <SectionHeader
          actions={
            <>
              <Button onClick={onRefreshHistory} type="button" variant="secondary">
                Refresh
              </Button>
              <Button onClick={onClearHistory} type="button" variant="danger">
                Clear Library
              </Button>
            </>
          }
          description="Reopen a draft, copy a share link, or download a finished export."
          eyebrow="Saved clips"
          title="Library"
        />

        <HistoryList
          items={exportHistory}
          emptyMessage="Exports and drafts will appear here."
          onReopen={onReopenHistory}
          onDelete={onDeleteHistory}
          onCopyShare={onCopyShare}
        />
      </MagicBento>
    </PageShell>
  );
}
