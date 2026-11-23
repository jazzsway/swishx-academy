"use client";

import { Fragment, Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UserRound, ChevronLeft, BookOpen, Bell } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { BrandMark } from "./brand";
import { ViewAs } from "./chrome"; // v1-hidden: Notifications (the Alerts tab replaces the header bell)
import { CopilotPanel } from "@/features/copilot/copilot-panel";
import { DeviceFrame } from "./device-frame";
import { useOffscreen } from "./screen-chrome";
import { useCopilot } from "@/features/copilot/copilot-store";

/* Three tabs: Home (everything to do and browse), SwishX in the middle (ask, talk, practise a call), Profile (progress and settings).
   My learning, Library and Practice are pages reached from these. */
const TABS = [
  { label: "Home", href: "/rep", icon: Home, exact: true },
  { label: "Trainings", href: "/rep/learn", icon: BookOpen },
  // v1-hidden: { label: "Practice", href: "/rep/practice", icon: Mic },
  { label: "Alerts", href: "/rep/notifications", icon: Bell },
  { label: "Profile", href: "/rep/me", icon: UserRound },
];

/** SwishX in the middle of the tab bar, the freud way: a raised dark circle that rises out of the glass, no label. */
function SwishXTab({ onOpen, disabled, open }: { onOpen: () => void; disabled: boolean; open: boolean }) {
  return (
    <button type="button" onClick={onOpen} disabled={disabled} aria-label="Ask SwishX" title="Ask SwishX" aria-expanded={open}
      className="focus-ring group grid h-full flex-1 place-items-center rounded-full disabled:opacity-40">
      <span className={cn("-mt-7 grid size-[62px] place-items-center rounded-full bg-cta text-white ring-[5px] ring-white/85",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,.35),0_12px_24px_-8px_rgba(40,25,15,.55)] transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95", open && "scale-95")}>
        <AgentIcon className="size-7" />
      </span>
    </button>
  );
}

/** A tab, iOS-style: icon over a one-word label; the selected one is tinted and sits on a soft platter. Minimised, just the icon. */
function Tab({ t, active, mini, badge }: { t: (typeof TABS)[number]; active: boolean; mini?: boolean; badge?: number }) {
  const Icon = t.icon;
  return (
    <Link href={t.href} aria-current={active ? "page" : undefined} aria-label={t.label}
      className={cn("focus-ring flex h-full min-w-0 flex-col items-center justify-center gap-[3px] rounded-full text-[11px] font-bold tracking-[0.01em] transition-colors duration-200",
        mini ? "w-14" : "flex-1", active ? "bg-white/70 text-brand-deep shadow-[inset_0_1px_1px_#fff,0_2px_6px_-2px_rgba(40,25,15,.18)]" : "text-ink hover:bg-white/40")}>
      <span className="relative">
        <Icon size={mini ? 24 : 23} strokeWidth={active ? 2.1 : 1.9} aria-hidden="true" />
        {!!badge && <span className="absolute -right-2 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white/90" aria-label={`${badge} new`}>{badge}</span>}
      </span>
      {!mini && <span className="leading-none">{t.label}</span>}
    </Link>
  );
}

/** Screens that take the whole phone: no tab bar, their own exit. */
const IMMERSIVE = [/\/rep\/onboarding/, /\/rep\/course\/[^/]+\/(screening|call|learn|assessment|attest)/, /\/rep\/practice\/(call|prep)/];
/** The tab screens: the only ones with the tab bar. Everything below them is a detail screen. */
const TAB_ROOTS = ["/rep", "/rep/learn", "/rep/notifications", "/rep/me"];

/** A detail screen's way back up, named after where it goes (the page keeps its own title). */
function detailOf(pathname: string) {
  const course = pathname.match(/^\/rep\/course\/([^/]+)(\/results)?/);
  if (course?.[2]) return { back: `/rep/course/${course[1]}`, label: "Training" };
  if (course) return { back: "/rep/learn", label: "Trainings" };
  if (pathname.startsWith("/rep/me/")) return { back: "/rep/me", label: "Profile" };
  if (pathname === "/rep/leaderboard" || pathname === "/rep/practice") return { back: "/rep/me", label: "Profile" };
  if (pathname.startsWith("/rep/practice/")) return { back: "/rep/practice", label: "Practice calls" };
  if (/^\/rep\/library\/.+/.test(pathname)) return { back: "/rep/library", label: "Library" };
  return { back: "/rep", label: "Home" };
}

/** Dark full-screen call screens: the device mock's status bar goes light on them. */
const DARK = [/\/rep\/course\/[^/]+\/call/, /\/rep\/practice\/call/];

/** No copilot while being measured, or mid-call. */
const NO_COPILOT = [/\/rep\/onboarding/, /\/rep\/course\/[^/]+\/(screening|call|assessment|attest)/, /\/rep\/practice\/call/];

/** The page's large title (its first h1), found again whenever the page's content changes. */
function usePageHeading(pathname: string, enabled: boolean) {
  const [h1, setH1] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!enabled) { setH1(null); return; }
    /* Looked up from the document, not a saved #rep-scroll: the desktop device mock mounts after the first render and replaces it. */
    const find = () => setH1((cur) => { const next = document.querySelector<HTMLElement>("#rep-scroll h1"); return next === cur ? cur : next; });
    find();
    const mo = new MutationObserver(find);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [pathname, enabled]);
  return h1;
}

/** Phone-first shell (PRD §9.1: rep screens mobile-first at 375px). From tablet width up it renders as a centred tablet (iPad portrait), the way most field reps use it. */
export function RepShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const viewAs = useApp((s) => s.viewAs);
  /* Re-check once saved state has loaded: before that, "me" is the default persona. */
  const hydrated = useApp((s) => s.hydrated);
  const unread = useApp((s) => s.notifications.filter((n) => n.userId === me.id && !n.read).length);
  const immersive = IMMERSIVE.some((r) => r.test(pathname));
  const tabs = !immersive && TAB_ROOTS.includes(pathname);
  const detail = !immersive && !tabs ? detailOf(pathname) : null;
  const copilot = !NO_COPILOT.some((r) => r.test(pathname));
  const openCopilot = useCopilot((s) => s.setOpen);
  const copilotOpen = useCopilot((s) => s.open);
  useEffect(() => { if (!copilot) openCopilot(false); }, [copilot, openCopilot]);
  /* iOS large titles: once the page's big heading scrolls under the header, its name takes the header's place. Not on Home, whose heading is a greeting. */
  const heading = usePageHeading(pathname, (tabs && pathname !== "/rep") || !!detail);
  const collapsed = useOffscreen(heading, { shellHeader: true });
  const pageTitle = heading?.textContent ?? "";
  /* The tab bar stays whole while you scroll. v1-hidden: the iOS 26 collapse on scroll (to a tab bubble at the
     bottom left and a SwishX circle at the right) didn't sit well on the iPad in landscape. Set this from the
     commented-out effect below to bring it back. */
  const mini = false;
  /* v1-hidden:
  /* iOS 26: the tab bar shrinks to the selected tab while you scroll down, and comes back when you scroll up or reach the top. *\/
  const [mini, setMini] = useState(false);
  useEffect(() => {
    setMini(false);
    if (!tabs) return;
    let last = 0;
    /* Caught on the document: the scroller is #rep-scroll in the desktop device mock (which mounts after the first render) and the window on a phone. *\/
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document;
      const y = t instanceof HTMLElement ? (t.id === "rep-scroll" ? t.scrollTop : null) : window.scrollY;
      if (y === null) return;
      if (y < 40) setMini(false);
      else if (y > last + 6) setMini(true);
      else if (y < last - 6) setMini(false);
      last = y;
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, [pathname, tabs]);
  */

  /* The rep app always renders as a rep. Checked on arrival only, so switching to the trainer from here isn't undone mid-navigation. */
  useEffect(() => {
    if (!me.roles.includes("rep")) viewAs("u-priya");
  }, [pathname, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The rep theme (globals.css [data-app="rep"]) also goes on <html> while a rep screen is open, so dialogs and popovers portalled to <body> wear it too. */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.app = "rep";
    return () => { delete root.dataset.app; };
  }, []);

  return (
    <div data-app="rep" className="min-h-dvh bg-[#ebe5df]">
     <DeviceFrame dark={DARK.some((r) => r.test(pathname))}>
      <div data-frame className="relative mx-auto flex min-h-dvh w-full max-w-[460px] md:max-w-[768px] flex-col bg-canvas desk:h-full desk:min-h-0 desk:max-w-none! desk:overflow-hidden">
        {tabs && (
          <header className={cn("sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2.5 bg-canvas/90 px-4 backdrop-blur transition-shadow", collapsed && "shadow-[0_1px_0_var(--color-hair-2)]")}>
            <BrandMark size={32} />
            <SwapTitle from="" to={pageTitle} show={collapsed} /> {/* Just the mark: no "Academy" name; the page title still slides in on scroll. */}
            <div className="ml-auto flex items-center gap-2">
              {/* v1-hidden: <Notifications /> — the Alerts tab replaces the bell. */}
              <ViewAs currentRole="Rep" compact />
            </div>
          </header>
        )}
        {/* Inside a tab: back up, the page's name, and the agent moves up here from the tab bar. */}
        {detail && (
          <header className={cn("sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 bg-canvas/90 px-4 backdrop-blur transition-shadow", collapsed && "shadow-[0_1px_0_var(--color-hair-2)]")}>
            <Link href={detail.back} className="focus-ring group flex h-11 min-w-0 items-center gap-2.5 rounded-full pr-2 text-body-lg font-bold text-ink">
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-hair-3 bg-card/60 transition-colors group-hover:bg-card"><ChevronLeft className="size-5" aria-hidden="true" /></span>
              <SwapTitle from={detail.label} to={pageTitle} show={collapsed} />
            </Link>
            <span className="flex-1" />
            {copilot && (
              <button type="button" onClick={() => openCopilot(true)} aria-label="Ask SwishX" aria-expanded={copilotOpen}
                className="focus-ring grid size-11 shrink-0 place-items-center rounded-full border border-tint-line bg-tint text-brand transition-transform hover:scale-105">
                <AgentIcon className="size-5" />
              </button>
            )}
            {/* v1-hidden: <Notifications /> — the Alerts tab replaces the bell. */}
            <ViewAs currentRole="Rep" compact />
          </header>
        )}
        <main id="rep-scroll" className={cn("flex flex-1 flex-col desk:min-h-0 desk:overflow-y-auto desk:[scrollbar-width:none]", tabs && "pb-32")}>{children}</main>
        {tabs && (
          /* The iOS 26 tab bar, as one floating Liquid Glass capsule: Home, SwishX in the middle, Profile, all alike (icon over a
             one-word label, the selected one tinted on a soft platter). Scrolling down collapses it the iOS way: the selected tab
             shrinks to a bubble at the bottom left, and SwishX waits in its own glass circle at the bottom right. */
          <nav aria-label="Tabs" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[460px] px-5 pb-[max(env(safe-area-inset-bottom),20px)] md:max-w-[480px] desk:absolute desk:max-w-none">
            {/* iOS 26's scroll edge effect: content fades out under the bar, so the glass always has a calm ground to sit on. */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-canvas from-25% via-canvas/70 to-canvas/0" />
            <div className="relative mx-auto flex max-w-[420px] items-center justify-between">
              <div className={cn("liquid-glass pointer-events-auto flex h-[64px] items-center gap-1 rounded-full p-1 transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]", mini ? "w-[64px]" : "w-full")}>
                {TABS.map((t, i) => {
                  const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
                  return (
                    <Fragment key={t.href}>
                      {i === 2 && !mini && <SwishXTab onOpen={() => openCopilot(true)} disabled={!copilot} open={copilotOpen} />}
                      {(!mini || active) && <Tab t={t} active={active} mini={mini} badge={t.href === "/rep/notifications" ? unread : undefined} />}
                    </Fragment>
                  );
                })}
              </div>
              {mini && (
                <button type="button" onClick={() => openCopilot(true)} disabled={!copilot} aria-label="Ask SwishX" title="Ask SwishX" aria-expanded={copilotOpen}
                  className="liquid-glass rise-in focus-ring pointer-events-auto grid size-[64px] shrink-0 place-items-center rounded-full text-ink transition-transform active:scale-95 disabled:opacity-40">
                  <AgentIcon className="size-6" />
                </button>
              )}
            </div>
          </nav>
        )}
        {copilot && <Suspense><CopilotPanel role="rep" variant="phone" /></Suspense>}
        {/* The refraction map the liquid glass tab bar bends its backdrop with (globals.css .liquid-glass). */}
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <filter id="lg-refract" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="10" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        {/* Overlay layer: dialogs, sheets and toasts portal here (components/ui/portal.tsx), so on the device mock they stay on its screen. */}
        <div id="rep-overlay" className="@container pointer-events-none fixed inset-0 z-[65] desk:absolute" />
      </div>
     </DeviceFrame>
    </div>
  );
}

/** The header's label, crossfading to the page's title while that is scrolled away (iOS large-title behaviour). */
function SwapTitle({ from, to, show }: { from: string; to: string; show: boolean }) {
  return (
    <span className="relative grid min-w-0 flex-1 items-center">
      <span className={cn("col-start-1 row-start-1 truncate text-subhead font-extrabold tracking-tight transition-all duration-200", show && "-translate-y-1.5 opacity-0")}>{from}</span>
      <span aria-hidden={!show} className={cn("col-start-1 row-start-1 truncate text-subhead font-extrabold tracking-tight transition-all duration-200", show ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0")}>{to}</span>
    </span>
  );
}
