"use client";

import Link from "next/link";
import { Bell, BellOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";

/** The Alerts tab: new trainings, due dates and results, newest first, grouped by day. Opening one marks it read. */
export function RepNotifications() {
  const me = useMe();
  const all = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markRead);
  const mine = all.filter((n) => n.userId === me.id);
  const unread = mine.filter((n) => !n.read).length;
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const groups = mine.reduce<{ day: string; items: typeof mine }[]>((acc, n) => {
    const d = day(n.at);
    const g = acc.find((x) => x.day === d);
    if (g) g.items.push(n); else acc.push({ day: d, items: [n] });
    return acc;
  }, []);

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 pt-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">Alerts</Text>
          <Text size="body" tone="subtle">{unread ? `${unread} new` : "You're all caught up"}</Text>
        </div>
        {unread > 0 && (
          <button type="button" onClick={() => markRead(me.id)} className="mb-1 shrink-0 rounded-full bg-tint px-3.5 py-2 text-body font-bold text-brand-deep transition-colors hover:bg-tint-strong">Mark all read</button>
        )}
      </div>

      {mine.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-card px-6 py-12 text-center shadow-hair">
          <span className="grid size-14 place-items-center rounded-full bg-subtle text-ink-3"><BellOff className="size-6" aria-hidden="true" /></span>
          <Text size="body-lg" weight="bold">Nothing yet</Text>
          <Text size="body" tone="subtle">New trainings, due dates and results show up here.</Text>
        </div>
      ) : groups.map((g) => (
        <section key={g.day} className="flex flex-col gap-2">
          <Text size="caption" weight="bold" tone="subtle" className="px-1">{g.day}</Text>
          <ul className="flex flex-col divide-y divide-hair overflow-hidden rounded-card bg-card shadow-hair">
            {g.items.map((n) => (
              <li key={n.id}>
                <Link href={n.href} onClick={() => markRead(me.id, n.id)} className={cn("flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-subtle", !n.read && "bg-tint/50")}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", n.read ? "bg-subtle text-ink-3" : "bg-peach text-white")}><Bell className="size-4.5" aria-hidden="true" /></span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2"><span className="text-body-lg font-bold text-ink">{n.title}</span>{!n.read && <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="New" />}</span>
                    <span className="text-body text-ink-3">{n.body}</span>
                  </span>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-ink-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
