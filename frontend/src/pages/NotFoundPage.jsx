import { ArrowLeft, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import PageShell from "../layouts/PageShell";

const DESTINATIONS = [
  {
    title: "Home",
    description: "Return to the product overview and jump back into the main workflow.",
  },
  {
    title: "Editor",
    description: "Retrieve a source, preview it locally, and trim the exact range you need.",
  },
  {
    title: "Library",
    description: "Reopen saved drafts, finished exports, and recent share-ready clips.",
  },
];

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <section className="surface-hero px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_72%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-5">
            <span className="section-eyebrow section-eyebrow--neutral py-1">
              <Compass className="h-3.5 w-3.5" />
              Route unavailable
            </span>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.08em] text-white sm:text-[3.25rem]">
                That page does not exist in this workspace.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                The link may be outdated, incomplete, or no longer part of the current app. You can jump back into the
                main flow below without losing your place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/")} type="button" variant="primary">
                Go Home
              </Button>
              <Button onClick={() => navigate("/editor")} type="button" variant="secondary">
                Open Editor
              </Button>
              <Button onClick={() => navigate(-1)} type="button" variant="ghost">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {DESTINATIONS.map((item) => (
              <div
                key={item.title}
                className="surface-panel--inset px-4 py-4"
              >
                <p className="text-base font-semibold tracking-[-0.03em] text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
