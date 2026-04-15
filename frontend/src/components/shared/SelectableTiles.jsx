import { cn } from "../../utils/cn";

export default function SelectableTiles({
  items,
  value,
  onChange,
  titleAs: TitleTag = "span",
  descriptionAs: DescriptionTag = "small",
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        items.length === 2 ? "sm:grid-cols-2" : "grid-cols-1",
      )}
    >
      {items.map((item) => (
        <button
          aria-pressed={value === item.key}
          className={cn(
            "group rounded-card border px-5 py-4 text-left transition duration-200",
            value === item.key
              ? "border-[color:var(--border-strong)] bg-[linear-gradient(180deg,rgba(129,95,255,0.18),rgba(73,87,255,0.08))] text-white shadow-button"
              : "border-[color:var(--border-subtle)] bg-[var(--surface-soft)] text-slate-200 shadow-panel-soft hover:border-[color:var(--border-strong)] hover:bg-white/[0.07]",
          )}
          key={item.key}
          onClick={() => onChange(item.key)}
          type="button"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <TitleTag className="block text-[15px] font-semibold leading-5 tracking-[-0.03em]">
                {item.title}
              </TitleTag>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                  value === item.key
                    ? "border-[color:var(--accent-border)] bg-white/10 text-violet-100"
                    : "border-[color:var(--border-subtle)] text-slate-500",
                )}
              >
                {value === item.key ? "Selected" : "Available"}
              </span>
            </div>

            <DescriptionTag className="block text-sm leading-6 text-slate-400">
              {item.description}
            </DescriptionTag>
          </div>
        </button>
      ))}
    </div>
  );
}
