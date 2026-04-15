import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import AppHeader from "../components/shared/AppHeader";
import AppProviders from "./providers/AppProviders";

export default function AppShell() {
  return (
    <AppProviders>
      <div className="relative min-h-screen bg-[#05060f] text-slate-100">
        <div className="relative z-10">
          <AppHeader />
          <Suspense fallback={<RoutePending />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </AppProviders>
  );
}

function RoutePending() {
  return (
    <div className="page-shell">
      <div
        aria-live="polite"
        className="surface-panel--strong flex min-h-[240px] items-center justify-center px-6 py-10 text-center"
        role="status"
      >
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Loading route
          </p>
          <p className="text-lg font-semibold tracking-[-0.03em] text-white">
            Preparing the workspace...
          </p>
        </div>
      </div>
    </div>
  );
}
