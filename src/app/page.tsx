"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Smartphone, Settings2, Palette } from "lucide-react";
import { useApp } from "@/store/app-store";
import { Text } from "@/components/ui/text";
import { Avatar, FictionalNote } from "@/components/patterns/academy";
import { BrandLockup } from "@/features/shell/brand";
import { PERSONAS } from "@/features/shell/chrome";

const ICONS = { Trainer: BarChart3, Manager: ShieldCheck, Rep: Smartphone, Admin: Settings2 } as const;

/** Mock sign-in: pick who you are (PRD §9.1 view-as). */
export default function SignIn() {
  const users = useApp((s) => s.users);
  const viewAs = useApp((s) => s.viewAs);
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto flex max-w-[980px] flex-col gap-10 px-5 py-10 sm:py-16">
        <BrandLockup sub="Corvana Therapeutics · prototype" />
        <div className="flex flex-col gap-3">
          <Text as="h1" size="hero-lg" weight="extrabold" tracking="tight" className="leading-[1.05]">
            Who are you today?
          </Text>
          <Text as="p" size="subhead" tone="muted" className="max-w-[60ch] leading-relaxed">
            Corvana is launching Lumora in six weeks. Pick a role to walk through the Academy. You can switch at any
            time from the avatar menu in the top right, and reset the demo from there too.
          </Text>
        </div>
        <div className="stagger-children grid gap-4 sm:grid-cols-2">
          {PERSONAS.map((p) => {
            const u = users.find((x) => x.id === p.userId)!;
            const Icon = ICONS[p.role];
            return (
              <Link key={p.role} href={p.href} onClick={() => viewAs(p.userId)}
                className="focus-ring squircle group flex items-center gap-4 rounded-card border border-hair bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-tint-line hover:shadow-soft">
                <Avatar initials={u.initials} size={52} tone={p.role === "Rep" ? "ink" : "tint"} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-brand-deep" aria-hidden="true" />
                    <Text size="caption" weight="bold" tone="brand-deep">{p.role}</Text>
                  </div>
                  <Text size="title" weight="bold">{u.name}</Text>
                  <Text size="body" tone="subtle">{p.role === "Rep" ? `${u.title} · ${u.territory}` : u.title}</Text>
                  <Text size="body" tone="muted">{p.blurb}</Text>
                </div>
                <ArrowRight className="size-5 text-ink-4 transition-transform group-hover:translate-x-1 group-hover:text-brand" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
        <Link href="/design-system" className="flex items-center gap-2 self-start text-body-lg font-semibold text-brand-deep hover:underline">
          <Palette className="size-4" aria-hidden="true" /> Design system & component library
        </Link>
        <FictionalNote />
      </div>
    </div>
  );
}
