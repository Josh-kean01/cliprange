import { cn } from "../lib/utils";

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
            "group rounded-[22px] border px-5 py-4 text-left transition duration-200",
            value === item.key
              ? "border-violet-300/50 bg-[linear-gradient(180deg,rgba(129,95,255,0.2),rgba(73,87,255,0.08))] text-white shadow-[0_12px_32px_rgba(92,84,255,0.18)]"
              : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.07]",
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
                    ? "border-violet-300/60 bg-white/10 text-violet-100"
                    : "border-white/10 text-slate-500",
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
