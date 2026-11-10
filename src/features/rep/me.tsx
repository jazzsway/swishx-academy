"use client";

import { useState } from "react";
import { Award, Flame, Printer } from "lucide-react"; // v1-hidden: Lock (badges)
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe, xpFor, fmtDate, LEVELS } from "@/store/selectors"; // v1-hidden: badgesFor
import { ORG } from "@/data/org";
import type { Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Ring, Avatar } from "@/components/patterns/academy";
import { BrandMark } from "@/features/shell/brand";

export function RepMe() {
  const me = useMe();
  const s = useApp();
  const [cert, setCert] = useState<Progress | null>(null);
  const xp = xpFor(s, me.id);
  // v1-hidden: const badges = badgesFor(s, me.id);
  const streak = s.streaks[me.id]?.days ?? 0;
  const certs = s.progress.filter((p) => p.userId === me.id && p.state === "certified");

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <div className="flex items-center gap-4">
        <Avatar initials={me.initials} size={60} tone="ink" />
        <div className="flex flex-col"><Text as="h1" size="display-lg" weight="extrabold">{me.name}</Text><Text size="body" tone="subtle">{me.title} · {me.territory}</Text></div>
      </div>

      <section className="squircle flex flex-col gap-4 rounded-card bg-ink p-5 text-white">
        <div className="flex items-center gap-4">
          <Ring value={xp.pctToNext} size={72} stroke={7} label={`Level ${xp.level}`}><Text size="display" weight="extrabold" tone="inverse">{xp.level}</Text></Ring>
          <div className="flex flex-1 flex-col gap-1">
            <Text size="title" weight="bold" tone="inverse">{xp.levelName}</Text>
            <Text size="body" tone="inverse" className="opacity-70">{xp.xp.toLocaleString()} XP{xp.next ? ` · ${xp.toNext} to ${xp.next.name}` : ""}</Text>
          </div>
          <div className="flex flex-col items-center"><span className="flex items-center gap-1 text-display font-extrabold text-brand-light"><Flame className="size-5" aria-hidden="true" />{streak}</span><span className="text-micro text-white/60">day streak</span></div>
        </div>
        <div className="flex gap-1.5">{LEVELS.map((l, i) => <div key={l.name} className="flex flex-1 flex-col gap-1"><div className={cn("h-1.5 rounded-full", i < xp.level ? "bg-brand" : "bg-white/15")} /><span className="text-micro text-white/60">{l.name}</span></div>)}</div>
        <Text size="caption" tone="inverse" className="opacity-60">XP comes from learning and practice. Attestations and safety acknowledgements never earn XP.</Text>
      </section>

      {/* v1-hidden: badges.
      <section className="flex flex-col gap-2.5">
        <Text as="h2" size="subhead" weight="bold">Badges</Text>
        <div className="grid grid-cols-2 gap-2.5">
          {badges.map((b) => (
            <div key={b.id} className={cn("squircle flex items-center gap-3 rounded-panel border p-3", b.earned ? "border-tint-line bg-tint" : "border-hair bg-card")}>
              <div className={cn("grid size-11 shrink-0 place-items-center rounded-full", b.earned ? "bg-brand text-white" : "bg-subtle text-ink-3")}>
                {b.earned ? <Award className="size-5" aria-hidden="true" /> : b.progress ? <span className="text-micro font-bold">{b.progress}</span> : <Lock className="size-4" aria-hidden="true" />}
              </div>
              <div className="flex min-w-0 flex-col"><Text size="body" weight="bold" className="leading-tight">{b.name}</Text><Text size="micro" tone="subtle" className="leading-tight">{b.description}</Text></div>
            </div>
          ))}
        </div>
      </section>
      */}

      <section className="flex flex-col gap-2.5">
        <Text as="h2" size="subhead" weight="bold">Certificates</Text>
        {certs.map((p) => {
          const c = s.courses.find((x) => x.id === p.courseId)!;
          const v = c.versions.find((x) => x.version === p.version);
          return (
            <button key={p.id} type="button" onClick={() => setCert(p)} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card p-4 text-left hover:bg-subtle">
              <span className="grid size-10 place-items-center rounded-full bg-ok-bg text-ok"><Award className="size-5" aria-hidden="true" /></span>
              <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold">{c.title}</Text><Text size="caption" tone="subtle">v{p.version}{v?.docNumber ? ` · ${v.docNumber}` : ""} · valid to {fmtDate(p.certExpiresAt, true)}</Text></div>
              <Text size="body" weight="semibold" tone="brand-deep">View</Text>
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-2.5 pb-4">
        <Text as="h2" size="subhead" weight="bold">Voice sessions</Text>
        <div className="squircle flex items-center justify-between gap-3 rounded-panel border border-hair bg-card p-4">
          <div className="flex flex-col"><Text size="body-lg" weight="semibold">Use my microphone in calls</Text><Text size="caption" tone="subtle">Off means you type your answers.</Text></div>
          <button type="button" role="switch" aria-checked={!!s.voiceConsent[me.id]} aria-label="Voice sessions" onClick={() => s.setVoiceConsent(me.id, !s.voiceConsent[me.id])}
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", s.voiceConsent[me.id] ? "bg-brand" : "bg-black/15")}>
            <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow-hair transition-all", s.voiceConsent[me.id] ? "left-6" : "left-1")} />
          </button>
        </div>
      </section>

      {cert && <CertificateModal p={cert} onClose={() => setCert(null)} />}
    </div>
  );
}

function CertificateModal({ p, onClose }: { p: Progress; onClose: () => void }) {
  const s = useApp();
  const me = useMe();
  const c = s.courses.find((x) => x.id === p.courseId)!;
  // v1-hidden (doc number): const v = c.versions.find((x) => x.version === p.version);
  const verifier = s.users.find((u) => u.id === p.verify?.by);
  return (
    <Modal open onClose={onClose} title="Certificate" size="md" footer={<Button onClick={() => window.print()}><Printer className="size-4" aria-hidden="true" />Print / save PDF</Button>}>
      <div className="flex flex-col items-center gap-3 rounded-panel border-2 border-tint-line bg-tint-2 px-6 py-8 text-center">
        <BrandMark size={44} />
        <Text size="caption" weight="bold" tone="brand-deep" uppercase tracking="wider">Certificate of readiness</Text>
        <Text size="hero" weight="extrabold" tracking="tight">{me.name}</Text>
        <Text size="body-lg" tone="muted">is certified on</Text>
        <Text size="display" weight="bold">{c.title}</Text>
        <Text size="body" tone="subtle">Version {p.version}</Text>
        <div className="mt-2 grid w-full grid-cols-2 gap-3 text-left text-body">
          <div className="flex flex-col"><span className="text-caption text-ink-3">Certified</span><strong>{fmtDate(p.certifiedAt, true)}</strong></div>
          <div className="flex flex-col"><span className="text-caption text-ink-3">Valid until</span><strong>{fmtDate(p.certExpiresAt, true)}</strong></div>
          <div className="flex flex-col"><span className="text-caption text-ink-3">Verified by</span><strong>{verifier?.name ?? "Automatic on pass"}</strong></div>
          <div className="flex flex-col"><span className="text-caption text-ink-3">Issued by</span><strong>{ORG.name}</strong></div>
        </div>
        <Text size="micro" tone="faint" className="mt-2">Internal training record · fictional prototype data</Text>
      </div>
    </Modal>
  );
}
