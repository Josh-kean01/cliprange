import { Link, NavLink, useLocation } from "react-router-dom";

import { cn } from "../../utils/cn";
import MagicBento from "../ui/MagicBento";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Editor", href: "/editor" },
  { label: "Library", href: "/library" },
];

export default function AppHeader() {
  const location = useLocation();
  const isEditorRoute = location.pathname.startsWith("/editor");

  return (
    <header className="sticky top-0 z-40 p-4 sm:px-6 lg:px-8">
      <MagicBento
        className="mx-auto px-4 py-3 sm:px-5"
        contentClassName="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center"
      >
        <div className="flex items-center justify-between gap-4 md:min-w-0">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <span className="surface-icon-shell text-sm font-semibold text-white">
              CR
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.03em] text-white">
                ClipRange
              </p>
              <p className="text-xs text-slate-400">
                Local-first YouTube clip editor
              </p>
            </div>
          </Link>

          <p className="flex items-center gap-2 text-xs text-slate-300 md:hidden">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border",
                isEditorRoute
                  ? "border-emerald-300 bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.7)]"
                  : "border-slate-500 bg-transparent",
              )}
            />
            <span>{isEditorRoute ? "Editor active" : "Editor idle"}</span>
          </p>
        </div>

        <nav
          aria-label="Primary"
          className="nav-pill"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              className="nav-pill__item hover:bg-white/8 hover:text-white"
              end={item.href === "/"}
              data-active={location.pathname === item.href || (item.href === "/" && location.pathname === "/") ? "true" : "false"}
              to={item.href}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex md:justify-end">
          <p className="items-center gap-2 text-xs text-slate-300 md:flex">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border",
                isEditorRoute
                  ? "border-emerald-300 bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.7)]"
                  : "border-slate-500 bg-transparent",
              )}
            />
            <span>Local Editor</span>
          </p>
        </div>
      </MagicBento>
    </header>
  );
}
