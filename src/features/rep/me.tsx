"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Flame, Printer, ChevronRight, LogOut, Mail, MapPin, Mic, Camera, Trash2, UserRound, Bell } from "lucide-react"; // v1-hidden: Lock (badges)
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe, xpFor, fmtDate, LEVELS } from "@/store/selectors"; // v1-hidden: badgesFor
import { ORG } from "@/data/org";
import type { Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Ring, Avatar } from "@/components/patterns/academy";
import { Field } from "@/components/ui/field";
import { BottomActions } from "@/features/shell/bottom-actions";
import { BrandMark } from "@/features/shell/brand";
import { RankCard } from "./leaderboard";

export function RepMe() {
  const me = useMe();
  const s = useApp();
  const [cert, setCert] = useState<Progress | null>(null);
  const xp = xpFor(s, me.id);
  // v1-hidden: const badges = badgesFor(s, me.id);
  const streak = s.streaks[me.id]?.days ?? 0;
  const certs = s.progress.filter((p) => p.userId === me.id && p.state === "certified");
  const router = useRouter();
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <Link href="/rep/me/profile" className="squircle flex items-center gap-4 rounded-card border border-hair bg-card p-4 shadow-hair transition-colors hover:bg-subtle">
        <Avatar initials={me.initials} src={me.photo} size={64} tone="ink" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text as="h1" size="display" weight="extrabold" truncate>{me.name}</Text>
          <Text size="body" tone="subtle" truncate>{me.title}</Text>
          <span className="flex items-center gap-1 truncate text-caption text-ink-3"><Mail className="size-3" aria-hidden="true" />{me.email}</span>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-body font-semibold text-brand-deep">Edit<ChevronRight className="size-4" aria-hidden="true" /></span>
      </Link>

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

      <RankCard />

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

      <section className="flex flex-col gap-2.5">
        <Text as="h2" size="subhead" weight="bold">Account</Text>
        <div className="squircle flex flex-col divide-y divide-hair overflow-hidden rounded-panel border border-hair bg-card">
          <Link href="/rep/me/profile" className="flex items-center gap-3 px-4 py-3.5 hover:bg-subtle">
            <UserRound className="size-5 text-ink-3" aria-hidden="true" />
            <span className="flex flex-1 flex-col"><Text size="body-lg" weight="semibold">Profile</Text><Text size="caption" tone="subtle">Name, email, position and photo</Text></span>
            <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Mic className="size-5 text-ink-3" aria-hidden="true" />
            <span className="flex flex-1 flex-col"><Text size="body-lg" weight="semibold">Use my microphone in calls</Text><Text size="caption" tone="subtle">Off means you type your answers.</Text></span>
            <button type="button" role="switch" aria-checked={!!s.voiceConsent[me.id]} aria-label="Voice sessions" onClick={() => s.setVoiceConsent(me.id, !s.voiceConsent[me.id])}
              className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", s.voiceConsent[me.id] ? "bg-brand" : "bg-black/15")}>
              <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow-hair transition-all", s.voiceConsent[me.id] ? "left-6" : "left-1")} />
            </button>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Bell className="size-5 text-ink-3" aria-hidden="true" />
            <span className="flex flex-1 flex-col"><Text size="body-lg" weight="semibold">Notifications</Text><Text size="caption" tone="subtle">New courses, due dates and results</Text></span>
            <Text size="caption" tone="subtle">On</Text>
          </div>
          {me.territory && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <MapPin className="size-5 text-ink-3" aria-hidden="true" />
              <span className="flex flex-1 flex-col"><Text size="body-lg" weight="semibold">Territory</Text><Text size="caption" tone="subtle">{me.territory} · set by your trainer</Text></span>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col items-center gap-2 pb-6">
        <button type="button" onClick={() => setConfirmOut(true)} className="squircle flex w-full items-center justify-center gap-2 rounded-panel border border-hair bg-card px-4 py-3.5 text-body-lg font-semibold text-danger transition-colors hover:bg-danger-bg">
          <LogOut className="size-5" aria-hidden="true" />Log out
        </button>
        <Text size="caption" tone="faint">{ORG.name} · SwishX Academy</Text>
      </section>

      <Modal open={confirmOut} onClose={() => setConfirmOut(false)} title="Log out?" size="sm"
        footer={<><Button variant="secondary" onClick={() => setConfirmOut(false)}>Cancel</Button><Button variant="danger" onClick={() => router.push("/signin")}>Log out</Button></>}>
        <Text size="body-lg" tone="muted">Your progress is saved. Sign in again any time to pick up where you left off.</Text>
      </Modal>

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

/** Resizes a picked image to a small square so it fits in saved state. */
function squareThumb(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const k = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, size, size);
      resolve(c.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** Edit your own profile: photo, first and last name, email, position. */
export function RepProfile() {
  const me = useMe();
  const router = useRouter();
  const updateUser = useApp((s) => s.updateUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [first, setFirst] = useState(me.first);
  const [last, setLast] = useState(me.name.slice(me.first.length).trim());
  const [email, setEmail] = useState(me.email);
  const [title, setTitle] = useState(me.title);
  const [photo, setPhoto] = useState(me.photo);
  const [saved, setSaved] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ok = first.trim() && last.trim() && emailOk && title.trim();
  const dirty = first !== me.first || last !== me.name.slice(me.first.length).trim() || email !== me.email || title !== me.title || photo !== me.photo;
  const initials = `${first.trim()[0] ?? ""}${last.trim()[0] ?? ""}`.toUpperCase() || me.initials;

  function save() {
    if (!ok) return;
    updateUser(me.id, { first: first.trim(), name: `${first.trim()} ${last.trim()}`, initials, email: email.trim(), title: title.trim(), photo });
    setSaved(true);
    window.setTimeout(() => router.push("/rep/me"), 700);
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pt-4">
      <Text as="h1" size="hero" weight="extrabold" tracking="tight">Edit profile</Text>

      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar initials={initials} src={photo} size={104} tone="ink" />
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change photo"
            className="absolute -bottom-1 -right-1 grid size-10 place-items-center rounded-full bg-brand text-white shadow-brand-lift ring-4 ring-canvas transition-transform hover:scale-105"><Camera className="size-4.5" /></button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await squareThumb(f)); e.target.value = ""; }} />
        <div className="flex gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="text-body font-semibold text-brand-deep hover:underline">{photo ? "Change photo" : "Add a photo"}</button>
          {photo && <button type="button" onClick={() => setPhoto(undefined)} className="flex items-center gap-1 text-body font-semibold text-ink-3 hover:text-danger"><Trash2 className="size-3.5" aria-hidden="true" />Remove</button>}
        </div>
      </div>

      <div className="squircle flex flex-col gap-4 rounded-card border border-hair bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" error={!first.trim() ? "Required" : undefined} />
          <Field label="Last name" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" error={!last.trim() ? "Required" : undefined} />
        </div>
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" error={email && !emailOk ? "Enter a valid email" : undefined} />
        <Field label="Position" value={title} onChange={(e) => setTitle(e.target.value)} hint="Shown to your trainer and on your certificates." autoComplete="organization-title" />
      </div>

      <BottomActions className="flex-row">
        <Button size="lg" variant="secondary" onClick={() => router.push("/rep/me")}>Cancel</Button>
        <Button size="lg" className="flex-1" disabled={!ok || !dirty || saved} onClick={save}>{saved ? "Saved" : "Save changes"}</Button>
      </BottomActions>
    </div>
  );
}
