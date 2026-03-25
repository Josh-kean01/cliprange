import { ArrowRight, Library, Scissors, Sparkles } from "lucide-react";

import PageShell from "../components/PageShell";
import MagicBento from "../components/ui/MagicBento";
import { Button } from "../components/ui/button";
import { useAppShellContext } from "../lib/app-shell-context";

export default function HomePage() {
  const { onOpenEditor, onOpenLibrary, libraryCount } = useAppShellContext();

  return (
    <PageShell>
      <MagicBento className="px-6 py-6 sm:px-8 sm:py-8" contentClassName="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_320px] lg:items-end">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-100">
            <Sparkles className="h-3.5 w-3.5" />
            Local YouTube clipping workspace
          </span>
          <div className="space-y-3">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.07em] text-white sm:text-[3.4rem]">
              Retrieve a source, trim the exact moment that matters, and export it with confidence.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              ClipRange keeps the preview local, gives you precise start and end controls, and lets you export a clean clip
              without burying the editor under extra UI.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onOpenEditor} type="button" variant="primary">
              Open Clipping Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={onOpenLibrary} type="button" variant="secondary">
              Open Library
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Library</p>
            <strong className="mt-2 block text-3xl font-semibold tracking-[-0.06em] text-white">{libraryCount}</strong>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              saved item{libraryCount === 1 ? "" : "s"} ready to reopen or ship.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Workflow</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Retrieve locally, trim precisely, and export as a download, share link, or draft.
            </p>
          </div>
        </div>
      </MagicBento>

      <section aria-label="How ClipRange works" className="grid gap-4 lg:grid-cols-3">
        <MagicBento className="px-5 py-5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">01</span>
          <strong className="mt-3 block text-lg font-semibold tracking-[-0.03em] text-white">Retrieve locally</strong>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Paste a YouTube link and bring a locally editable preview into the workspace.
          </p>
        </MagicBento>

        <MagicBento className="px-5 py-5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">02</span>
          <strong className="mt-3 block text-lg font-semibold tracking-[-0.03em] text-white">Trim precisely</strong>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Set your range with the timeline, preview playback, and exact start and end time inputs.
          </p>
        </MagicBento>

        <MagicBento className="px-5 py-5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">03</span>
          <strong className="mt-3 block text-lg font-semibold tracking-[-0.03em] text-white">Export with intent</strong>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Download a finished clip, create a share link, or save a draft for later.
          </p>
        </MagicBento>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <MagicBento className="px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
              <Scissors className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em] text-white">Focused editor surface</p>
              <p className="text-sm leading-6 text-slate-300">The workspace stays centered on preview, range selection, and export.</p>
            </div>
          </div>
        </MagicBento>

        <MagicBento className="px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
              <Library className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em] text-white">Library that stays close</p>
              <p className="text-sm leading-6 text-slate-300">Recent exports and drafts stay one click away while the workspace remains clean.</p>
            </div>
          </div>
        </MagicBento>
      </section>
    </PageShell>
  );
}
