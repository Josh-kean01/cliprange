import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ExternalLink,
  Eye,
  FileText,
  Hash,
  Heart,
  MessageSquare,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "../../../components/ui/button";
import { useAccessibleDialog } from "../../../hooks/useAccessibleDialog";
import { cn } from "../../../utils/cn";

export default function VideoDetailsModal({ onClose, open, session }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const summaryId = useId();
  const details = session?.videoDetails ?? null;

  useAccessibleDialog({
    open,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
  });

  if (!open || !session || typeof document === "undefined") {
    return null;
  }

  const title = session.title || "Retrieved clip";
  const description = details?.description || "";
  const thumbnailUrl = session.preview?.posterUrl || session.thumbnailUrl || "";
  const sourceUrl = session.source?.sourceUrl || "";
  const isShort = session.source?.sourceKind === "short";
  const channelName = details?.channelName || details?.uploaderName || "";
  const categories = details?.categories ?? [];
  const tags = details?.tags ?? [];
  const hasRichMetadata = Boolean(details);

  return createPortal(
    <div
      aria-hidden={!open}
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#03040c]/82 backdrop-blur-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-start justify-center p-3 sm:p-4 lg:items-center lg:p-6">
        <section
          aria-describedby={summaryId}
          aria-labelledby="video-details-title"
          aria-modal="true"
          className="my-auto flex max-h-[min(92dvh,960px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(120,96,255,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(74,222,255,0.12),transparent_28%),rgba(6,8,18,0.96)] shadow-[0_38px_120px_rgba(0,0,0,0.58)]"
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
            <div className="min-w-0 space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-300">
                <FileText className="h-3.5 w-3.5" />
                Video Details
              </span>
              <div className="space-y-1">
                <h2
                  className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-[2rem]"
                  id="video-details-title"
                >
                  {title}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-300" id={summaryId}>
                  {session.metaSummary || "Retrieved source metadata"}
                </p>
              </div>
            </div>

            <Button
              aria-label="Close video details"
              className="shrink-0 px-3"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Close</span>
            </Button>
          </header>

          <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
              <aside className="order-first space-y-5 xl:order-last xl:space-y-6">
                <div
                  className={cn(
                    "overflow-hidden rounded-[26px] border border-white/10 bg-black/30",
                    isShort && "mx-auto w-full max-w-[320px]",
                  )}
                >
                  <div className={isShort ? "aspect-[9/16] w-full bg-black/40" : "aspect-video w-full bg-black/40"}>
                    {thumbnailUrl ? (
                      <img
                        alt={title}
                        className="h-full w-full object-cover"
                        src={thumbnailUrl}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-400">
                        Thumbnail unavailable
                      </div>
                    )}
                  </div>
                </div>

                <section className="rounded-[26px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className="space-y-2">
                    <SectionTitle
                      description="Channel, source, and performance details captured during retrieval."
                      title="Snapshot"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="violet">Metadata snapshot</Pill>
                      <Pill tone="cyan">{isShort ? "Short" : "Video"}</Pill>
                      {session.subtitleTrack ? <Pill tone="emerald">Captions available</Pill> : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {sourceUrl ? (
                      <Button
                        className="w-full justify-center sm:w-auto"
                        href={sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                        variant="secondary"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open source
                      </Button>
                    ) : null}
                    {details?.videoId ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300">
                        <Hash className="h-3.5 w-3.5 text-slate-400" />
                        {details.videoId}
                      </span>
                    ) : null}
                  </div>

                  <dl className="mt-5 space-y-3">
                    <DetailRow
                      icon={<UserRound className="h-4 w-4" />}
                      label="Channel"
                      value={channelName || "Unavailable"}
                    />
                    <DetailRow
                      icon={<UserRound className="h-4 w-4" />}
                      label="Uploader"
                      value={details?.uploaderName || "Unavailable"}
                    />
                    <DetailRow
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Published"
                      value={formatDate(details?.uploadDate)}
                    />
                    <DetailRow
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Released"
                      value={formatDate(details?.releaseDate)}
                    />
                    <DetailRow
                      icon={<Eye className="h-4 w-4" />}
                      label="Views"
                      value={formatCount(details?.viewCount)}
                    />
                    <DetailRow
                      icon={<Heart className="h-4 w-4" />}
                      label="Likes"
                      value={formatCount(details?.likeCount)}
                    />
                    <DetailRow
                      icon={<MessageSquare className="h-4 w-4" />}
                      label="Comments"
                      value={formatCount(details?.commentCount)}
                    />
                  </dl>
                </section>
              </aside>

              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {channelName ? <Pill tone="default">{channelName}</Pill> : null}
                    {categories.length ? <Pill tone="default">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</Pill> : null}
                    {tags.length ? <Pill tone="default">{tags.length} tag{tags.length === 1 ? "" : "s"}</Pill> : null}
                  </div>

                  {!hasRichMetadata ? (
                    <div className="rounded-[24px] border border-dashed border-white/12 bg-black/10 px-4 py-4">
                      <p className="max-w-2xl text-sm leading-6 text-slate-300">
                        This session only has the basic clip record. Retrieve the original source again to repopulate its
                        full YouTube description, tags, and channel metadata.
                      </p>
                    </div>
                  ) : null}
                </section>

                <section className="space-y-3 border-t border-white/10 pt-6">
                  <SectionTitle
                    description="The full source description returned during retrieval."
                    title="Description"
                  />
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                      {description || "No description was returned for this source."}
                    </p>
                  </div>
                </section>

                <section className="space-y-3 border-t border-white/10 pt-6">
                  <SectionTitle
                    description="Categories returned by the source platform."
                    title="Categories"
                  />
                  <TagCollection
                    emptyMessage="No categories were returned for this source."
                    items={categories}
                    tone="subtle"
                  />
                </section>

                <section className="space-y-3 border-t border-white/10 pt-6">
                  <SectionTitle
                    description="Every source tag available at retrieve time."
                    title="Tags"
                  />
                  <TagCollection
                    emptyMessage="No tags were returned for this source."
                    items={tags}
                    tone="accent"
                  />
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}

function SectionTitle({ description, title }) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold tracking-[-0.04em] text-white">
        {title}
      </h3>
      {description ? (
        <p className="text-sm leading-6 text-slate-300">{description}</p>
      ) : null}
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/8 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="flex items-center gap-2 text-sm text-slate-400">
        <span className="text-slate-500">{icon}</span>
        {label}
      </dt>
      <dd className="text-sm font-medium leading-6 text-slate-100 sm:max-w-[65%] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function Pill({ children, tone = "default" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        tone === "violet" && "border-violet-400/25 bg-violet-400/10 text-violet-100",
        tone === "cyan" && "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
        tone === "emerald" && "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
        tone === "default" && "border-white/10 bg-white/6 text-slate-200",
      )}
    >
      {children}
    </span>
  );
}

function TagCollection({ emptyMessage, items, tone }) {
  if (!items.length) {
    return (
      <p className="rounded-[24px] border border-dashed border-white/10 px-4 py-4 text-sm leading-6 text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
      {items.map((item) => (
        <span
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            tone === "accent"
              ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
              : "border-white/10 bg-white/6 text-slate-200",
          )}
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function formatCount(value) {
  if (!Number.isFinite(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat().format(value);
}

function formatDate(value) {
  const rawValue = String(value ?? "").trim();

  if (!/^\d{8}$/.test(rawValue)) {
    return "Unavailable";
  }

  const year = rawValue.slice(0, 4);
  const month = rawValue.slice(4, 6);
  const day = rawValue.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat([], {
    dateStyle: "medium",
  }).format(date);
}
