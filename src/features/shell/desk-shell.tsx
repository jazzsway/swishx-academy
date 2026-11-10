"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, FileCheck2, Users, ShieldCheck, Settings2, GraduationCap, Menu, X, LineChart, Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { BrandLockup, BrandMark } from "./brand";
import { Notifications, ViewAs } from "./chrome";
import { ORG } from "@/data/org";
import { CopilotButton, CopilotPanel } from "@/features/copilot/copilot-panel";

type DeskRole = "Trainer" | "Manager";

interface NavItem { label: string; href: string; icon: ReactNode; badge?: number; exact?: boolean }

const I = { size: 17, strokeWidth: 1.85 };

function useNav(role: DeskRole): { label?: string; items: NavItem[] }[] {
  const me = useMe();
  const pendingVerify = useApp((s) =>
    s.progress.filter((p) => p.state === "awaiting_verify" && s.users.find((u) => u.id === p.userId)?.managerId === me.id).length,
  );
  if (role === "Trainer")
    return [
      { items: [
        { label: "Home", href: "/trainer", icon: <Home {...I} />, exact: true },
        { label: "Courses", href: "/trainer/courses", icon: <BookOpen {...I} /> },
        // v1-hidden: { label: "Campaigns", href: "/trainer/campaigns", icon: <Flag {...I} /> },
        // v1-hidden: { label: "Library", href: "/trainer/library", icon: <Library {...I} /> },
        { label: "Analytics", href: "/trainer/analytics", icon: <LineChart {...I} /> },
        { label: "Records", href: "/trainer/records", icon: <FileCheck2 {...I} /> },
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

  const renderNav = (compact: boolean) => (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-5">
      {groups.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {g.label && (compact ? <span className="mx-auto mb-1 h-px w-6 bg-hair-2" aria-hidden="true" /> : <Text size="micro" tone="faint" weight="bold" uppercase tracking="wider" className="px-3 pb-1">{g.label}</Text>)}
          {g.items.map((it) => {
            const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} title={compact ? it.label : undefined} aria-label={compact ? it.label : undefined}
                className={cn("focus-ring relative flex h-10 items-center gap-3 rounded-control text-body-lg transition-colors", compact ? "justify-center px-0" : "px-3",
                  active ? "bg-tint font-semibold text-brand-deep" : "font-medium text-ink-2 hover:bg-subtle hover:text-ink")}>
                {it.icon}
                {!compact && <span className="flex-1">{it.label}</span>}
                {it.badge !== undefined && (compact
                  ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand" aria-hidden="true" />
                  : <span className="rounded-glyph bg-brand px-1.5 text-micro font-bold text-white">{it.badge}</span>)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col gap-6 border-r border-hair bg-card py-5 transition-[width] duration-200 lg:flex", collapsed ? "w-[72px] px-2.5" : "w-[248px] px-3")}>
        <div className={collapsed ? "flex justify-center" : "px-2"}>{collapsed ? <BrandMark /> : <BrandLockup sub={ORG.name} />}</div>
        {renderNav(collapsed)}
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "justify-between px-1")}>
          {!collapsed && <Text as="p" size="micro" tone="faint" className="px-2">Prototype · all data fictional</Text>}
          <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="focus-ring grid size-9 shrink-0 place-items-center rounded-control text-ink-3 hover:bg-subtle hover:text-ink">
            {collapsed ? <PanelLeftOpen className="size-4.5" aria-hidden="true" /> : <PanelLeftClose className="size-4.5" aria-hidden="true" />}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-[280px] flex-col gap-6 bg-card px-3 py-5 shadow-modal">
            <div className="flex items-center justify-between px-2"><BrandLockup sub={ORG.name} />
              <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-subtle"><X className="size-4" /></button>
            </div>
            {renderNav(false)}
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
