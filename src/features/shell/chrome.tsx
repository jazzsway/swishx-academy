"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, RotateCcw, Check, Presentation } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/patterns/academy";
import { Portal } from "@/components/ui/portal";

export const PERSONAS = [
  { userId: "u-maya", role: "Trainer", href: "/trainer", blurb: "Builds courses, runs MLR, proves progress" },
  // v1-hidden: managers aren't in v1, only trainers and reps.
  // { userId: "u-david", role: "Manager", href: "/manager", blurb: "Verifies reps, coaches the Northeast team" },
  { userId: "u-priya", role: "Rep", href: "/rep", blurb: "Learns, gets screened, practises privately" },
] as const;

function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onOut(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [ref, onOut, active]);
}

/** The prototype's "View as" control. Switching persona also switches screen. Presenter tools live here, out of the product's own navigation. */
export function ViewAs({ currentRole, compact }: { currentRole: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const users = useApp((s) => s.users);
  const viewAs = useApp((s) => s.viewAs);
  const resetDemo = useApp((s) => s.resetDemo);
  const presenter = useApp((s) => s.presenter);
  const setPresenter = useApp((s) => s.setPresenter);
  const me = useMe();
  useOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
        className="focus-ring flex h-10 items-center gap-2 rounded-control border border-hair-2 bg-card pl-1.5 pr-2.5 text-body font-semibold text-ink transition-colors hover:bg-subtle">
        <Avatar initials={me.initials} size={28} />
        {!compact && <span className="hidden sm:inline">{me.first}</span>}
        <span className="rounded-glyph bg-tint px-1.5 py-0.5 text-micro font-bold text-brand-deep">{currentRole}</span>
        <ChevronDown className="size-3.5 text-ink-3" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="select-pop absolute right-0 z-50 mt-2 w-[300px] rounded-panel border border-hair bg-card p-1.5 shadow-float">
          <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="block px-2.5 pb-1 pt-1.5">View as</Text>
          {PERSONAS.map((p) => {
            const u = users.find((x) => x.id === p.userId)!;
            const active = me.id === p.userId && currentRole === p.role;
            return (
              <button key={p.role} role="menuitem" type="button"
                onClick={() => { viewAs(p.userId); setOpen(false); router.push(p.href); }}
                className={cn("flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-subtle", active && "bg-tint")}>
                <Avatar initials={u.initials} size={32} tone={active ? "ink" : "tint"} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body font-semibold text-ink">{u.name} · {p.role}</span>
                  <span className="truncate text-caption text-ink-3">{p.blurb}</span>
                </span>
                {active && <Check className="size-4 text-brand" aria-hidden="true" />}
              </button>
            );
          })}
          <div className="my-1.5 border-t border-hair" />
          <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="block px-2.5 pb-1 pt-1.5">Presenter tools</Text>
          <button type="button" role="menuitemcheckbox" aria-checked={presenter} onClick={() => setPresenter(!presenter)}
            className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-body font-semibold text-ink-2 hover:bg-subtle">
            <Presentation className="size-4" aria-hidden="true" />
            <span className="flex flex-1 flex-col"><span>Presenter mode</span><span className="text-caption font-normal text-ink-3">Tap-to-answer on calls, no retake wait</span></span>
            <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", presenter ? "bg-brand" : "bg-black/15")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-hair transition-all", presenter ? "left-4.5" : "left-0.5")} /></span>
          </button>
          {/* v1-hidden: <Link href="/design-system" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-body font-semibold text-ink-2 hover:bg-subtle">
            <Palette className="size-4" aria-hidden="true" /> Design system
          </Link> */}
          <button type="button" onClick={() => { resetDemo(); setOpen(false); router.push("/trainer"); }}
            className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-body font-semibold text-ink-2 hover:bg-subtle">
            <RotateCcw className="size-4" aria-hidden="true" /> Reset demo data
          </button>
        </div>
      )}
    </div>
  );
}

export function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const me = useMe();
  const all = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markRead);
  const mine = all.filter((n) => n.userId === me.id).slice(0, 20);
  const unread = mine.filter((n) => !n.read).length;
  useOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Notifications, ${unread} unread`} onClick={() => setOpen(!open)}
        className="focus-ring relative grid size-10 place-items-center rounded-control border border-hair-2 bg-card text-ink-2 hover:bg-subtle">
        <Bell className="size-4.5" aria-hidden="true" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-micro font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
        </Portal>
      )}
      {open && (
        <div className="select-pop absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-panel border border-hair bg-card shadow-float">
          <div className="flex items-center justify-between border-b border-hair px-4 py-3">
            <Text size="body-lg" weight="bold">Notifications</Text>
            {unread > 0 && <button type="button" className="text-body font-semibold text-brand-deep hover:underline" onClick={() => markRead(me.id)}>Mark all read</button>}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {mine.length === 0 && <Text as="p" size="body" tone="subtle" className="px-4 py-8 text-center">You're all caught up.</Text>}
            {mine.map((n) => (
              <button key={n.id} type="button" onClick={() => { markRead(me.id, n.id); setOpen(false); router.push(n.href); }}
                className="flex w-full gap-3 border-b border-hair px-4 py-3 text-left last:border-0 hover:bg-subtle">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} aria-hidden="true" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body font-semibold text-ink">{n.title}</span>
                  <span className="text-caption text-ink-3">{n.body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
