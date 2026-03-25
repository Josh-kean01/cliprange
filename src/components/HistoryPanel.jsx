import HistoryList from "./HistoryList";
import SectionHeader from "./SectionHeader";
import { Button } from "./ui/button";

export default function HistoryPanel({
  title,
  items,
  emptyMessage,
  onRefresh,
  onClear,
  onReopen,
  onDelete,
  onCopyShare,
}) {
  return (
    <section className="space-y-4">
      <SectionHeader
        actions={
          <>
            <Button onClick={onRefresh} size="sm" type="button" variant="ghost">
              Refresh
            </Button>
            {onClear ? (
              <Button onClick={onClear} size="sm" type="button" variant="ghost">
                Clear
              </Button>
            ) : null}
          </>
        }
        compact
        title={title}
        titleAs="h3"
      />
      <HistoryList
        items={items}
        emptyMessage={emptyMessage}
        onReopen={onReopen}
        onDelete={onDelete}
        onCopyShare={onCopyShare}
      />
    </section>
  );
}
