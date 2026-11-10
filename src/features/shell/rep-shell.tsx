"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Mic, UserRound } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { BrandMark } from "./brand";
import { Notifications, ViewAs } from "./chrome";
import { CopilotPanel } from "@/features/copilot/copilot-panel";
import { useCopilot } from "@/features/copilot/copilot-store";

const TABS = [
  { label: "Home", href: "/rep", icon: Home, exact: true },
  { label: "My learning", href: "/rep/learn", icon: BookOpen },
  // v1-hidden: { label: "Library", href: "/rep/library", icon: Library },
  { label: "Practice", href: "/rep/practice", icon: Mic },
  { label: "Me", href: "/rep/me", icon: UserRound },
];

function Tab({ t, active }: { t: (typeof TABS)[number]; active: boolean }) {
  const Icon = t.icon;
  return (
    <Link href={t.href} aria-current={active ? "page" : undefined}
      className={cn("focus-ring flex flex-col items-center gap-1 rounded-control py-1.5 text-micro font-semibold transition-colors", active ? "text-brand-deep" : "text-ink-3 hover:text-ink")}>
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
      {t.label}
    </Link>
  );
}

/** Screens that take the whole phone: no tab bar, their own exit. */
const IMMERSIVE = [/\/rep\/onboarding/, /\/rep\/course\/[^/]+\/(screening|call|learn|assessment|attest)/, /\/rep\/practice\/(call|prep)/];
/** No copilot while being measured, or mid-call. */
const NO_COPILOT = [/\/rep\/onboarding/, /\/rep\/course\/[^/]+\/(screening|call|assessment|attest)/, /\/rep\/practice\/call/];

/** Phone-first shell (PRD §9.1: rep screens mobile-first at 375px). On a desktop it renders as a centred phone column. */
export function RepShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const viewAs = useApp((s) => s.viewAs);
  /* Re-check once saved state has loaded: before that, "me" is the default persona. */
  const hydrated = useApp((s) => s.hydrated);
  const immersive = IMMERSIVE.some((r) => r.test(pathname));
  const copilot = !NO_COPILOT.some((r) => r.test(pathname));
  const openCopilot = useCopilot((s) => s.setOpen);
  const copilotOpen = useCopilot((s) => s.open);
  useEffect(() => { if (!copilot) openCopilot(false); }, [copilot, openCopilot]);

  /* The rep app always renders as a rep. Checked on arrival only, so switching to the trainer from here isn't undone mid-navigation. */
  useEffect(() => {
    if (!me.roles.includes("rep")) viewAs("u-priya");
  }, [pathname, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-dvh bg-[#eceae6] sm:py-6">
      <div data-frame className="relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col bg-canvas sm:h-[calc(100dvh-48px)] sm:min-h-0 sm:overflow-hidden sm:rounded-card sm:shadow-float">
        {!immersive && (
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-hair bg-canvas/90 px-4 backdrop-blur">
            <BrandMark size={28} />
            <span className="text-body-lg font-extrabold tracking-tight">Academy</span>
            <div className="ml-auto flex items-center gap-2">
              <Notifications />
              <ViewAs currentRole="Rep" compact />
            </div>
          </header>
        )}
        <main id="rep-scroll" className={cn("flex flex-1 flex-col sm:min-h-0 sm:overflow-y-auto", !immersive && "pb-24 sm:pb-6")}>{children}</main>
        {!immersive && (
          <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[460px] grid-cols-5 items-end border-t border-hair bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-2 backdrop-blur-xl sm:static sm:pb-3">
            {TABS.slice(0, 2).map((t) => <Tab key={t.href} t={t} active={t.exact ? pathname === t.href : pathname.startsWith(t.href)} />)}
            {/* The agent sits in the middle of the tab bar, raised: the one thing a rep can always ask. */}
            <button type="button" onClick={() => openCopilot(true)} disabled={!copilot} aria-label="Open SwishX AI Agent" aria-expanded={copilotOpen}
              className="focus-ring group flex flex-col items-center gap-1 rounded-control pb-1.5 text-micro font-bold text-brand-deep disabled:opacity-40">
              <span className={cn("-mt-6 grid size-14 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-deep text-white shadow-brand-lift ring-4 ring-card transition-transform group-hover:scale-105 group-active:scale-95", copilotOpen && "scale-105")}>
                <AgentIcon className="size-7" />
              </span>
              Ask SwishX
            </button>
            {TABS.slice(2).map((t) => <Tab key={t.href} t={t} active={t.exact ? pathname === t.href : pathname.startsWith(t.href)} />)}
          </nav>
        )}
        {copilot && <Suspense><CopilotPanel role="rep" variant="phone" /></Suspense>}
      </div>
    </div>
  );
}
