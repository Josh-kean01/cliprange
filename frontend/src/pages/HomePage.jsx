import { ArrowRight, Library, PlayCircle, Scissors, Share2, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import PageShell from "../layouts/PageShell";
import { useLibraryStore } from "../state/library/LibraryProvider";

const WORKFLOW_STEPS = [
  {
    title: "Retrieve locally",
    description: "Paste a YouTube link and bring a local preview into the workspace without leaving the editor.",
  },
  {
    title: "Trim precisely",
    description: "Use the preview stage, playhead, and exact time controls to isolate the moment that matters.",
  },
  {
    title: "Ship cleanly",
    description: "Download a finished clip, generate a share page, or save a draft that stays easy to reopen.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { state, ensureLibraryLoaded } = useLibraryStore();
  const libraryCount = state.items.length;
  const libraryCountLabel = !state.hasLoaded ? "Syncing" : state.error ? "Unavailable" : `${libraryCount}`;
  const librarySummary = !state.hasLoaded
    ? "Checking recent drafts and finished exports."
    : state.error
      ? "The library will reconnect as soon as the server responds."
      : `${libraryCount} saved item${libraryCount === 1 ? "" : "s"} ready to reopen.`;

  useEffect(() => {
    void ensureLibraryLoaded();
  }, [ensureLibraryLoaded]);

  return (
    <PageShell>
      <section className="surface-hero px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_70%)] opacity-80" />
        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] xl:items-center">
          <div className="space-y-6">
            <span className="section-eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Local-first YouTube clipping workspace
            </span>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-[2.7rem] font-semibold leading-[0.96] tracking-[-0.08em] text-white sm:text-[3.55rem] lg:text-[4.4rem]">
                Clip the exact beat, reaction, or reveal without losing the thread.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                ClipRange keeps the flow local and focused: retrieve the source, trim inside a clean preview stage,
                then send the finished moment out as a download, share page, or draft without fighting the UI.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate("/editor")} type="button" variant="primary">
                Open Clipping Workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={() => navigate("/library")} type="button" variant="secondary">
                Open Library
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HeroMetric
                label="Source flow"
                title="Retrieve -> preview -> trim"
                description="The editing surface stays centered on the moment you need to cut."
              />
              <HeroMetric
                label="Library"
                title={libraryCountLabel}
                description={librarySummary}
              />
              <HeroMetric
                label="Outputs"
                title="Download, share, or draft"
                description="One workspace for short exports, handoff links, and saved passes."
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-6 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(132,90,255,0.28),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(74,222,255,0.12),transparent_45%)] blur-3xl" />
            <div className="surface-panel relative overflow-hidden p-4 sm:p-5">
              <div className="surface-panel--inset flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Editor Preview</p>
                  <p className="truncate text-sm font-medium text-white">Source loaded, range ready, export staged</p>
                </div>
                <span className="surface-chip surface-chip--success">
                  Live
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div className="surface-panel--inset overflow-hidden bg-black/40">
                    <div className="aspect-video bg-[radial-gradient(circle_at_top,rgba(132,90,255,0.2),transparent_45%),linear-gradient(180deg,rgba(7,9,20,0.62),rgba(0,0,0,0.88))] p-5">
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <span className="surface-chip border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                              Preview stage
                            </span>
                            <div>
                              <p className="text-lg font-semibold tracking-[-0.04em] text-white">Reveal highlight - 00:41 to 00:57</p>
                              <p className="text-sm text-slate-300">Playback, trim handles, and export controls stay in one view.</p>
                            </div>
                          </div>
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
                            <PlayCircle className="h-5 w-5" />
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-full border border-white/10 bg-white/5 p-1.5">
                            <div className="relative h-2 rounded-full bg-white/8">
                              <span className="absolute inset-y-0 left-[14%] right-[24%] rounded-full bg-[linear-gradient(90deg,rgba(130,90,255,0.9),rgba(68,211,255,0.9))]" />
                              <span className="absolute left-[42%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/60 bg-white shadow-[0_0_16px_rgba(255,255,255,0.38)]" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
                            <span>Start 00:41</span>
                            <span>Playhead 00:49</span>
                            <span>End 00:57</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <WorkflowChip icon={<PlayCircle className="h-4 w-4" />} label="Retrieve" value="Source cached locally" />
                    <WorkflowChip icon={<Scissors className="h-4 w-4" />} label="Trim" value="Precise time handles" />
                    <WorkflowChip icon={<Share2 className="h-4 w-4" />} label="Export" value="Download or share" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <PreviewSideCard
                    eyebrow="Clip package"
                    title="Export intent"
                    description="Switch between clean download, share page, or draft without leaving the editor."
                  />
                  <PreviewSideCard
                    eyebrow="Library"
                    title={libraryCountLabel}
                    description={librarySummary}
                  />
                  <PreviewSideCard
                    eyebrow="Guardrails"
                    title="Source-first actions"
                    description="Only the actions that make sense stay active, so the workflow feels deliberate."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="surface-panel px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Workflow</span>
            <h2 className="text-2xl font-semibold tracking-[-0.05em] text-white">Built around the exact moment you want to keep</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              The interface is arranged like a production tool, not a checklist: source first, preview in the middle,
              trim decisions beside the playback, and export only when the clip is actually ready.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {WORKFLOW_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="surface-panel--inset px-4 py-4"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  0{index + 1}
                </span>
                <p className="mt-3 text-base font-semibold tracking-[-0.03em] text-white">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel--strong px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="surface-icon-shell h-12 w-12">
              <Library className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">What stays close</span>
              <h2 className="text-2xl font-semibold tracking-[-0.05em] text-white">Recent exports stay one step away from the editor</h2>
              <p className="text-sm leading-6 text-slate-300">
                Reopen a draft, grab the latest download, or copy a share page without digging through hidden menus.
                The workspace stays focused, but your history stays nearby.
              </p>
            </div>
          </div>

          <div className="surface-panel--inset mt-5 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Current library snapshot</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold tracking-[-0.06em] text-white">{libraryCountLabel}</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">{librarySummary}</p>
              </div>
              <Button onClick={() => navigate("/library")} type="button" variant="secondary">
                View Library
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function HeroMetric({ description, label, title }) {
  return (
    <div className="surface-panel--inset px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}

function WorkflowChip({ icon, label, value }) {
  return (
    <div className="surface-panel--inset px-4 py-3">
      <div className="flex items-center gap-2 text-slate-200">
        <span className="text-violet-100">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{value}</p>
    </div>
  );
}

function PreviewSideCard({ description, eyebrow, title }) {
  return (
    <div className="surface-panel px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
