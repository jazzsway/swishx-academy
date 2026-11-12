"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Users, ShieldCheck, Settings2, GraduationCap, Menu, X, LineChart, Home, PanelLeftClose, PanelLeftOpen, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { LogoMark } from "@/components/ui/logo-mark";
import { Notifications, ViewAs } from "./chrome";
import { ORG } from "@/data/org";
import { CopilotButton, CopilotPanel } from "@/features/copilot/copilot-panel";

type DeskRole = "Trainer" | "Manager";

interface NavItem { label: string; shortLabel?: string; href: string; icon: ReactNode; badge?: number; exact?: boolean }

/* Same icon weight as SwishX for Biz's rail. */
const I = { size: 16, strokeWidth: 1.75 };

function useNav(role: DeskRole): { label?: string; items: NavItem[] }[] {
  const me = useMe();
  const pendingVerify = useApp((s) =>
    s.progress.filter((p) => p.state === "awaiting_verify" && s.users.find((u) => u.id === p.userId)?.managerId === me.id).length,
  );
  if (role === "Trainer")
    return [
      { items: [{ label: "Home", href: "/trainer", icon: <Home {...I} />, exact: true }] },
      { label: "Training", items: [
        { label: "Courses", href: "/trainer/courses", icon: <BookOpen {...I} /> },
        // v1-hidden: { label: "Campaigns", href: "/trainer/campaigns", icon: <Flag {...I} /> },
        // v1-hidden: { label: "Library", href: "/trainer/library", icon: <Library {...I} /> },
      ] },
      { label: "Insights", items: [
        { label: "Analytics", href: "/trainer/analytics", icon: <LineChart {...I} /> },
        { label: "Teams", href: "/trainer/records", icon: <Users {...I} /> },
        { label: "Leaderboard", href: "/trainer/leaderboard", icon: <Trophy {...I} /> },
      ] },
      { label: "Workspace", items: [{ label: "Settings", href: "/trainer/settings", icon: <Settings2 {...I} /> }] },
    ];
  return [
      { items: [
        { label: "Home", href: "/manager", icon: <BarChart3 {...I} />, exact: true },
        { label: "Verify", href: "/manager/verify", icon: <ShieldCheck {...I} />, badge: pendingVerify || undefined },
        { label: "Team", href: "/manager/team", icon: <Users {...I} /> },
        { label: "My learning", href: "/manager/learning", icon: <GraduationCap {...I} /> },
      ] },
    ];
}

/** Desktop shell for trainer and manager: sidebar, content, and the copilot on the right. */
export function DeskShell({ role, children }: { role: DeskRole; children: ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const viewAs = useApp((s) => s.viewAs);
  /* Re-check once saved state has loaded: before that, "me" is the default persona. */
  const hydrated = useApp((s) => s.hydrated);
  const groups = useNav(role);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Keep the URL honest: a trainer route always renders as a trainer. Checked on arrival only, so a
     persona switch made here (View as → Rep) isn't undone before the navigation to /rep lands. */
  useEffect(() => {
    const need = role === "Manager" ? "manager" : "trainer";
    if (!me.roles.includes(need)) viewAs(role === "Manager" ? "u-david" : "u-maya");
  }, [pathname, role, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setMobileOpen(false), [pathname]);

  /* Collapsed shows icons only. Remembered per browser; a failed read just starts expanded. */
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem("sx-sidebar") === "collapsed"); } catch { /* storage blocked */ } }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sx-sidebar", next ? "collapsed" : "open"); } catch { /* storage blocked */ }
  };

  const isOn = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  /* The SwishX for Biz rail: small uppercase group labels, a solid orange row for the section
     you're in, and sub-pages hung off their parent on a hairline. Collapsed, each row is an icon
     with a short label under it. */
  const renderNav = (compact: boolean) => (
    <nav aria-label="Main" className={cn("flex flex-1 flex-col gap-3.5 overflow-y-auto py-2 [scrollbar-width:none]", compact ? "items-center px-2" : "px-3")}>
      {groups.map((g, gi) => (
        <div key={gi} className={cn("flex flex-col gap-1.5", compact && "items-center")}>
          {g.label && (compact
            ? <span className="my-1 h-px w-7 bg-gradient-to-r from-transparent via-hair-2 to-transparent" aria-hidden="true" />
            : <span className="px-2 pt-1 text-caption font-extrabold uppercase tracking-[0.14em] text-ink-3">{g.label}</span>)}
          {g.items.map((it) => {
            const active = isOn(it.href, it.exact);
            return (
              <div key={it.href} className={cn("flex flex-col", compact && "items-center")}>
                <Link href={it.href} aria-current={active ? "page" : undefined} title={compact ? it.label : undefined}
                  className={cn("focus-ring group relative flex items-center rounded-control transition-all duration-150",
                    compact ? "w-[58px] flex-col justify-center gap-1 px-1 py-2" : "h-[42px] w-full gap-3 px-3",
                    active ? "bg-brand text-white shadow-brand-lift" : "text-ink-2 hover:bg-tint hover:text-brand-deep")}>
                  <span className={cn("shrink-0", active ? "text-white" : "text-ink-3 group-hover:text-brand")}>{it.icon}</span>
                  <span className={cn("truncate tracking-tight", compact ? "text-caption leading-none" : "flex-1 text-body-lg",
                    active ? "font-[750] text-white" : "font-normal text-ink group-hover:font-bold")}>{compact ? it.shortLabel ?? it.label : it.label}</span>
                  {it.badge !== undefined && (compact
                    ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand" aria-hidden="true" />
                    : <span className={cn("rounded-chip px-2 py-0.5 text-caption font-bold", active ? "bg-white/25 text-white" : "bg-brand text-white")}>{it.badge}</span>)}
                </Link>
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );

  /* The org and the person signed in, at the foot of the rail. */
  const footer = (compact: boolean) => (
    <div className="space-y-1.5 border-t border-hair p-2">
      {!compact && (
        <div className="flex items-center gap-2 rounded-control border border-tint-line bg-gradient-to-r from-tint to-white px-2.5 py-2">
          <GraduationCap className="size-4 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-label font-extrabold leading-none text-ink">{ORG.name}</span>
            <span className="mt-0.5 block truncate text-micro font-bold uppercase text-ink-3">Academy · prototype data</span>
          </div>
        </div>
      )}
      <Link href="/trainer/settings/people" title={compact ? `${me.name} · ${role}` : undefined}
        className={cn("flex w-full items-center rounded-control border border-hair bg-black/[0.02] p-1.5 transition-all hover:bg-black/[0.05]", compact ? "justify-center" : "gap-2.5")}>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-deep text-label font-[800] text-white shadow-hair">{me.initials}</span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-bold leading-tight text-ink">{me.name}</span>
            <span className="mt-0.5 block truncate text-caption font-bold text-brand">{role}</span>
          </span>
        )}
      </Link>
    </div>
  );

  /* Collapse chip: the same small raised control as SwishX for Biz, in both states. */
  const toggle = (
    <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="group grid size-8 shrink-0 place-items-center rounded-control border border-hair-2 text-ink-3 transition-all duration-200 hover:scale-105 hover:border-tint-line hover:text-brand-deep active:scale-95"
      style={{ background: "linear-gradient(155deg,#ffffff,#f6f4f2)", boxShadow: "0 2px 6px -2px rgba(10,13,20,.1), inset 0 1px 0 rgba(255,255,255,.9)" }}>
      {collapsed ? <PanelLeftOpen size={15} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-0.5" /> : <PanelLeftClose size={15} strokeWidth={2} className="transition-transform duration-300 group-hover:-translate-x-0.5" />}
    </button>
  );

  /* Lockup: the knot on a soft tile, the wordmark, and "Academy" set beneath it. */
  const brand = (compact: boolean) => (
    <Link href={role === "Trainer" ? "/trainer" : "/manager"} aria-label="SwishX Academy home" className="focus-ring flex min-w-0 items-center gap-2.5 rounded-control">
      <span className="grid size-9 shrink-0 place-items-center rounded-control border border-tint-line bg-gradient-to-br from-tint to-white shadow-hair">
        <LogoMark size={20} className="text-brand" />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="text-title font-[800] tracking-tight text-ink">swish<span className="text-brand">X</span></span>
          <span className="mt-1 text-micro font-bold uppercase tracking-[0.22em] text-brand-deep">Academy</span>
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Floating island, as in SwishX for Biz. */}
      <div className="sticky top-0 hidden h-dvh shrink-0 p-3 lg:flex">
        <aside style={{ width: collapsed ? 80 : 252, transition: "width 0.32s cubic-bezier(0.22, 1, 0.36, 1)" }}
          className={cn("relative flex h-full flex-col overflow-hidden border border-hair bg-white/95 shadow-float backdrop-blur-xl", collapsed ? "rounded-panel" : "rounded-card")}>
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" aria-hidden="true" />
          <div className={cn("flex items-center border-b border-hair px-3.5 pb-3 pt-3.5", collapsed ? "flex-col gap-2.5" : "justify-between")}>
            {brand(collapsed)}
            {toggle}
          </div>
          {renderNav(collapsed)}
          {footer(collapsed)}
        </aside>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative m-3 flex w-[272px] flex-col overflow-hidden rounded-card border border-hair bg-white shadow-modal">
            <div className="flex items-center justify-between px-4 pb-2.5 pt-4">{brand(false)}
              <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-subtle"><X className="size-4" /></button>
            </div>
            {renderNav(false)}
            {footer(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-(--screen-header-h) shrink-0 items-center gap-3 border-b border-hair bg-canvas/90 px-4 backdrop-blur sm:px-6">
          <button type="button" aria-label="Open menu" onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-control border border-hair-2 bg-card lg:hidden"><Menu className="size-4.5" /></button>
          <div className="lg:hidden"><Text size="body-lg" weight="extrabold">Academy</Text></div>
          <div className="ml-auto flex items-center gap-2">
            <Suspense><CopilotButton role={role === "Manager" ? "manager" : "trainer"} /></Suspense>
            <Notifications />
            <ViewAs currentRole={role} />
          </div>
        </header>
        <main className="page-enter mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <Suspense><CopilotPanel role={role === "Manager" ? "manager" : "trainer"} variant="desk" /></Suspense>
    </div>
  );
}
