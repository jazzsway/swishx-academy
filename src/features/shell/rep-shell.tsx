"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Mic, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { BrandMark } from "./brand";
import { Notifications, ViewAs } from "./chrome";

const TABS = [
  { label: "Home", href: "/rep", icon: Home, exact: true },
  { label: "Learn", href: "/rep/learn", icon: BookOpen },
  { label: "Practice", href: "/rep/practice", icon: Mic },
  { label: "Me", href: "/rep/me", icon: UserRound },
];

/** Screens that take the whole phone: no tab bar, their own exit. */
const IMMERSIVE = [/\/rep\/onboarding/, /\/rep\/course\/[^/]+\/(screening|call|learn|assessment|attest)/, /\/rep\/practice\/(call|prep)/];

/** Phone-first shell (PRD §9.1: rep screens mobile-first at 375px). On a desktop it renders as a centred phone column. */
export function RepShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const viewAs = useApp((s) => s.viewAs);
  const immersive = IMMERSIVE.some((r) => r.test(pathname));

  /* The rep app renders as Priya unless a manager deliberately opened their own learning. */
  useEffect(() => {
    if (me.roles.includes("rep")) return;
    let learnerAs: string | null = null;
    try { learnerAs = sessionStorage.getItem("academy-learner-as"); } catch { /* storage blocked */ }
    if (learnerAs !== me.id) viewAs("u-priya");
  }, [me, viewAs]);

  return (
    <div className="min-h-dvh bg-[#eceae6] sm:py-6">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col bg-canvas sm:h-[calc(100dvh-48px)] sm:min-h-0 sm:overflow-hidden sm:rounded-card sm:shadow-float">
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
          <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[460px] grid-cols-4 border-t border-hair bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-2 backdrop-blur sm:static sm:pb-3">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                  className={cn("focus-ring flex flex-col items-center gap-1 rounded-control py-1.5 text-micro font-semibold transition-colors",
                    active ? "text-brand-deep" : "text-ink-3 hover:text-ink")}>
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
