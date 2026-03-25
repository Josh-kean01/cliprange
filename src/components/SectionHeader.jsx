import { cn } from "../lib/utils";

export default function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  icon,
  titleAs: TitleTag = "h2",
  className,
  compact = false,
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-100"
          >
            {icon}
          </span>
        ) : null}
        <div className="space-y-1.5">
          {eyebrow ? <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">{eyebrow}</span> : null}
          <TitleTag className={cn("font-semibold tracking-[-0.04em] text-white", compact ? "text-lg" : "text-2xl sm:text-[1.8rem]")}>
            {title}
          </TitleTag>
          {description ? <p className="max-w-2xl text-sm leading-6 text-slate-300">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
