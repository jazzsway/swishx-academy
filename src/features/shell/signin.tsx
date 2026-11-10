"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/store/app-store";
import { ORG } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/patterns/academy";
import { LogoMark } from "@/components/ui/logo-mark";
import { PERSONAS } from "./chrome";

/** Where "Log out" lands. The prototype has no passwords: pick who to sign back in as. */
export function SignIn() {
  const router = useRouter();
  const users = useApp((s) => s.users);
  const viewAs = useApp((s) => s.viewAs);
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-card border border-tint-line bg-gradient-to-br from-tint to-white shadow-soft"><LogoMark size={30} className="text-brand" /></span>
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">You&apos;re signed out</Text>
          <Text size="body-lg" tone="subtle">{ORG.name} · SwishX Academy</Text>
        </div>
        <div className="squircle flex flex-col gap-2 rounded-card border border-hair bg-card p-3 shadow-soft">
          <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider" className="px-2 pt-1">Sign in again as</Text>
          {PERSONAS.map((p) => {
            const u = users.find((x) => x.id === p.userId)!;
            return (
              <button key={p.role} type="button" onClick={() => { viewAs(p.userId); router.push(p.href); }}
                className="flex items-center gap-3 rounded-control px-2.5 py-2.5 text-left transition-colors hover:bg-subtle">
                <Avatar initials={u.initials} src={u.photo} size={40} />
                <span className="flex min-w-0 flex-1 flex-col"><span className="text-body-lg font-semibold text-ink">{u.name}</span><span className="truncate text-caption text-ink-3">{p.role} · {u.email}</span></span>
                <ArrowRight className="size-4 text-ink-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <Text size="caption" tone="faint" className="text-center">Prototype with fictional data. No passwords.</Text>
      </div>
    </div>
  );
}
