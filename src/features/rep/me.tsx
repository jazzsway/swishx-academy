"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Flame, ChevronRight, LogOut, Mail, MapPin, Mic, Camera, Trash2, UserRound, Bell, Target, BadgeCheck, Download, Share } from "lucide-react"; // v1-hidden: Lock (badges)
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe, xpFor, fmtDate, LEVELS } from "@/store/selectors";
import { competency } from "@/data/org"; // v1-hidden: badgesFor
import { ORG } from "@/data/org";
import type { Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Sheet } from "@/components/ui/sheet";
import { Ring, Avatar } from "@/components/patterns/academy";
import { Field } from "@/components/ui/field";
import { BottomActions } from "@/features/shell/bottom-actions";
import { BrandMark } from "@/features/shell/brand";
import { RankTile } from "./leaderboard";
import { useRep } from "./use-rep";

export function RepMe() {
  const { me, s, active } = useRep();
  const [cert, setCert] = useState<Progress | null>(null);
  const [allCerts, setAllCerts] = useState(false);
  const xp = xpFor(s, me.id);
  // v1-hidden: const badges = badgesFor(s, me.id);
  const streak = s.streaks[me.id]?.days ?? 0;
  const certs = s.progress.filter((p) => p.userId === me.id && p.state === "certified")
    .sort((a, b) => (a.certExpiresAt ?? "").localeCompare(b.certExpiresAt ?? ""));
  const router = useRouter();
  const [confirmOut, setConfirmOut] = useState(false);

  /* Where they stand: the latest scores on their main training, weakest first. */
  const scored = active.find((p) => p.screening);
  const latest = scored ? (scored.attempts.at(-1)?.competencyScores ?? scored.screening!.scores) : undefined;
  const focus = latest ? Object.entries(latest).sort((a, b) => a[1] - b[1]).slice(0, 4) : [];
  const readiness = latest ? Math.round(Object.values(latest).reduce((a, b) => a + b, 0) / Object.values(latest).length) : undefined;

  /* Practice calls: private to the rep, kept 30 days. */
  const calls = s.practice.filter((x) => x.userId === me.id && x.kind === "roleplay" && x.result);
  const week = calls.filter((x) => Date.now() - new Date(x.at).getTime() < 7 * 864e5).length;
  const best = calls.length ? Math.max(...calls.map((x) => x.result!.score)) : undefined;

  return (
    <div className="flex flex-col gap-7 px-4 pb-4 pt-3">
      <Link href="/rep/me/profile" className="flex items-center gap-4 rounded-card bg-card p-4 shadow-soft transition-transform active:scale-[0.99]">
        <Avatar initials={me.initials} src={me.photo} size={64} tone="ink" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text as="h1" size="display" weight="extrabold" truncate>{me.name}</Text>
          <Text size="body" tone="subtle" truncate>{me.title}</Text>
          {me.territory && <span className="flex items-center gap-1 truncate text-caption text-ink-3"><MapPin className="size-3" aria-hidden="true" />{me.territory}</span>}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle text-ink-2"><ChevronRight className="size-5" aria-hidden="true" /></span>
      </Link>

      {/* Your numbers: whole-colour tiles. */}
      <section aria-label="Your numbers" className="flex flex-col gap-3">
        <Text as="h2" size="title" weight="extrabold" tracking="tight">Your numbers</Text>
        <div className="grid grid-cols-2 gap-3">
          <ReadinessTile score={readiness} source={scored ? (scored.attempts.length ? "Last assessment" : "Screening") : undefined} href={scored ? `/rep/course/${scored.courseId}` : "/rep"} />
          <RankTile />
        </div>
      </section>

      {/* Certifications: a rail of certificates; See all opens them all in a sheet. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <Text as="h2" size="title" weight="extrabold" tracking="tight">Certifications</Text>
          {certs.length > 0 && <button type="button" onClick={() => setAllCerts(true)} className="flex items-center gap-0.5 text-body font-bold text-brand-deep">See all {certs.length}<ChevronRight className="size-4" aria-hidden="true" /></button>}
        </div>
        {certs.length ? (
          <div className="-mx-4 -my-3 flex snap-x gap-3 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {certs.map((p) => <CertCard key={p.id} p={p} onOpen={() => setCert(p)} />)}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-panel bg-card p-4 shadow-hair">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-subtle text-ink-3"><Award className="size-5" aria-hidden="true" /></span>
            <Text size="body" tone="subtle">Finish a training to earn your first certification.</Text>
          </div>
        )}
      </section>

      {/* Practice calls moved here from their own tab: practising itself starts from SwishX. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <Text as="h2" size="title" weight="extrabold" tracking="tight">Practice calls</Text>
          <Link href="/rep/practice" className="flex items-center gap-0.5 text-body font-bold text-brand-deep">{calls.length ? `See all ${calls.length}` : "Open"}<ChevronRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[{ label: "This week", value: week, tile: "bg-lilac" }, { label: "Calls", value: calls.length, tile: "bg-sage" }, { label: "Best", value: best ?? "–", tile: "bg-peach" }].map((t) => (
            <div key={t.label} className={cn("flex flex-col gap-1 rounded-panel px-3.5 py-3 text-white shadow-soft", t.tile)}>
              <span className="text-caption font-bold text-white/90">{t.label}</span>
              <span className="text-display font-extrabold leading-none tabular-nums">{t.value}</span>
            </div>
          ))}
        </div>
        {calls.slice(0, 2).map((x) => (
          <Link key={x.id} href={`/rep/practice/session/${x.id}`} className="flex items-center gap-3 rounded-panel bg-card px-4 py-3 shadow-hair">
            <Ring value={x.result!.score} size={40} stroke={4} label={`${x.result!.score}%`}><Text size="micro" weight="bold">{x.result!.score}</Text></Ring>
            <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="bold" truncate>{x.title}</Text><Text size="caption" tone="subtle">{fmtDate(x.at)} · only you can see it</Text></span>
            <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
          </Link>
        ))}
      </section>

      {focus.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <Text as="h2" size="title" weight="extrabold" tracking="tight">Where to focus</Text>
            <Text size="caption" tone="subtle">{scored!.attempts.length ? "From your last assessment" : "From your screening"}</Text>
          </div>
          {focus.map(([k, v]) => {
            const tone = v >= 80 ? { bg: "bg-sage-bg", fg: "text-ok", bar: "bg-sage" } : v >= 50 ? { bg: "bg-sun-bg", fg: "text-warn", bar: "bg-sun" } : { bg: "bg-peach-bg", fg: "text-brand-deep", bar: "bg-peach" };
            return (
              <div key={k} className="flex items-center gap-3 rounded-panel bg-card p-3 pr-4 shadow-hair">
                <span className={cn("grid size-12 shrink-0 place-items-center rounded-full text-body-lg font-extrabold tabular-nums", tone.bg, tone.fg)}>{v}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate text-body-lg font-bold text-ink">{competency(k)?.name}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-subtle"><div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${v}%` }} /></div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-card bg-ink p-5 text-white">
        <div className="flex items-center gap-4">
          <Ring value={xp.pctToNext} size={64} stroke={7} tone="white" label={`Level ${xp.level}`}><Text size="display" weight="extrabold" tone="inverse">{xp.level}</Text></Ring>
          <div className="flex flex-1 flex-col gap-1">
            <Text size="title" weight="bold" tone="inverse">{xp.levelName}</Text>
            <Text size="body" tone="inverse" className="opacity-70">{xp.xp.toLocaleString()} XP{xp.next ? ` · ${xp.toNext} to ${xp.next.name}` : ""}</Text>
          </div>
          <div className="flex flex-col items-center"><span className="flex items-center gap-1 text-display font-extrabold text-brand-light"><Flame className="size-5" aria-hidden="true" />{streak}</span><span className="text-micro text-white/60">day streak</span></div>
        </div>
        <div className="flex gap-1.5">{LEVELS.map((l, i) => <div key={l.name} className="flex flex-1 flex-col gap-1"><div className={cn("h-1.5 rounded-full", i < xp.level ? "bg-brand-2" : "bg-white/15")} /><span className="text-micro text-white/60">{l.name}</span></div>)}</div>
      </section>

      <section className="flex flex-col gap-3">
        <Text as="h2" size="title" weight="extrabold" tracking="tight">Settings</Text>
        <div className="flex flex-col divide-y divide-hair overflow-hidden rounded-panel bg-card shadow-hair">
          <Link href="/rep/me/profile" className="flex items-center gap-3 px-4 py-3.5 hover:bg-subtle">
            <span className="grid size-9 place-items-center rounded-full bg-subtle text-ink-2"><UserRound className="size-4.5" aria-hidden="true" /></span>
            <span className="flex flex-1 flex-col"><Text size="body-lg" weight="semibold">Profile</Text><Text size="caption" tone="subtle">Name, email, position and photo</Text></span>
            <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-9 place-items-center rounded-full bg-subtle text-ink-2"><Mic className="size-4.5" aria-hidden="true" /></span>
            <span className="flex flex-1 flex-col"><Text size="body-lg" weight="semibold">Use my microphone</Text><Text size="caption" tone="subtle">For calls and talking to SwishX. Off means you type.</Text></span>
            <button type="button" role="switch" aria-checked={!!s.voiceConsent[me.id]} aria-label="Use my microphone" onClick={() => s.setVoiceConsent(me.id, !s.voiceConsent[me.id])}
              className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors", s.voiceConsent[me.id] ? "bg-sage" : "bg-black/15")}>
              <span className={cn("absolute top-[2px] size-[27px] rounded-full bg-white shadow-soft transition-all", s.voiceConsent[me.id] ? "left-[22px]" : "left-[2px]")} />
            </button>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-9 place-items-center rounded-full bg-subtle text-ink-2"><Bell className="size-4.5" aria-hidden="true" /></span>
            <span className="flex flex-1 flex-col"><Text size="body-lg" weight="semibold">Notifications</Text><Text size="caption" tone="subtle">New trainings, due dates and results</Text></span>
            <Text size="caption" tone="subtle">On</Text>
          </div>
          <span className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-9 place-items-center rounded-full bg-subtle text-ink-2"><Mail className="size-4.5" aria-hidden="true" /></span>
            <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold">Email</Text><Text size="caption" tone="subtle" truncate>{me.email}</Text></span>
          </span>
        </div>
      </section>

      <section className="flex flex-col items-center gap-2 pb-4">
        <button type="button" onClick={() => setConfirmOut(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-card px-4 py-3.5 text-body-lg font-bold text-danger shadow-hair transition-colors hover:bg-danger-bg">
          <LogOut className="size-5" aria-hidden="true" />Log out
        </button>
        <Text size="caption" tone="faint">{ORG.name} · SwishX Academy</Text>
      </section>

      <Modal open={confirmOut} onClose={() => setConfirmOut(false)} title="Log out?" size="sm"
        footer={<><Button variant="danger" fullWidth size="lg" onClick={() => router.push("/signin")}>Log out</Button><Button variant="ghost" fullWidth onClick={() => setConfirmOut(false)}>Cancel</Button></>}>
        <Text size="body-lg" tone="muted">Your progress is saved. Sign in again any time to pick up where you left off.</Text>
      </Modal>

      <Sheet open={allCerts} onClose={() => setAllCerts(false)} title="Certifications" description={`${certs.length} active · you'll be reminded before one runs out`}>
        <div className="flex flex-col gap-2.5">
          {certs.map((p) => <CertRow key={p.id} p={p} onOpen={() => { setAllCerts(false); setCert(p); }} />)}
        </div>
      </Sheet>

      {cert && <CertificateSheet p={cert} onClose={() => setCert(null)} />}
    </div>
  );
}

/** Home-style tile: the rep's average score on their main training. */
function ReadinessTile({ score, source, href }: { score?: number; source?: string; href: string }) {
  return (
    <Link href={href} className="focus-ring relative flex min-h-[176px] flex-col justify-between overflow-hidden rounded-card bg-sage p-4 text-white shadow-soft transition-transform active:scale-[0.98]">
      <span className="flex items-center gap-1.5 text-body font-bold"><Target className="size-4" aria-hidden="true" />Readiness</span>
      <Ring value={score ?? 0} size={76} stroke={8} tone="white" label={score === undefined ? "No score yet" : `${score} out of 100`}>
        <span className="text-title font-extrabold tabular-nums">{score ?? "–"}</span>
      </Ring>
      <span className="text-caption font-semibold text-white/90">{score === undefined ? "Take a screening to see it" : `From your ${source?.toLowerCase()}`}</span>
    </Link>
  );
}

/* A certificate runs out; warn two months ahead. */
const expiring = (p: Progress) => !!p.certExpiresAt && new Date(p.certExpiresAt).getTime() - Date.now() < 60 * 864e5;

/** A certificate as a small card for the Certifications rail. */
function CertCard({ p, onOpen }: { p: Progress; onOpen: () => void }) {
  const s = useApp();
  const c = s.courses.find((x) => x.id === p.courseId)!;
  return (
    <button type="button" onClick={onOpen} className="relative flex w-[244px] shrink-0 snap-start flex-col gap-3 overflow-hidden rounded-card border-2 border-tint-line bg-tint-2 p-4 text-left shadow-soft transition-transform active:scale-[0.98]">
      <span className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-tint-strong" aria-hidden="true" />
      <span className="relative flex items-center justify-between">
        <BrandMark size={32} />
        {expiring(p) ? <span className="rounded-full bg-sun-bg px-2.5 py-1 text-micro font-bold text-warn">Renew soon</span>
          : <span className="flex items-center gap-1 rounded-full bg-sage-bg px-2.5 py-1 text-micro font-bold text-ok"><BadgeCheck className="size-3.5" aria-hidden="true" />Active</span>}
      </span>
      <span className="relative text-micro font-bold uppercase tracking-wider text-brand-deep">Certified</span>
      <span className="relative -mt-2 line-clamp-2 min-h-[2.6em] text-body-lg font-extrabold leading-snug text-ink">{c.title}</span>
      <span className="relative text-caption text-ink-3">v{p.version} · valid to {fmtDate(p.certExpiresAt, true)}</span>
    </button>
  );
}

function CertRow({ p, onOpen }: { p: Progress; onOpen: () => void }) {
  const s = useApp();
  const c = s.courses.find((x) => x.id === p.courseId)!;
  return (
    <button type="button" onClick={onOpen} className="flex items-center gap-3 rounded-panel bg-subtle/60 p-3.5 text-left transition-colors hover:bg-subtle">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-tint text-brand-deep"><Award className="size-5" aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Text size="body-lg" weight="bold" className="leading-snug">{c.title}</Text>
        <Text size="caption" tone={expiring(p) ? "warn" : "subtle"} weight={expiring(p) ? "semibold" : undefined}>Certified {fmtDate(p.certifiedAt)} · valid to {fmtDate(p.certExpiresAt, true)}</Text>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
    </button>
  );
}

function CertificateSheet({ p, onClose }: { p: Progress; onClose: () => void }) {
  const s = useApp();
  const me = useMe();
  const c = s.courses.find((x) => x.id === p.courseId)!;
  // v1-hidden (doc number): const v = c.versions.find((x) => x.version === p.version);
  const verifier = s.users.find((u) => u.id === p.verify?.by);
  return (
    <Sheet open onClose={onClose} title="Certification"
      footer={<>
        <Button size="lg" fullWidth onClick={() => window.print()}><Download className="size-4" aria-hidden="true" />Save as PDF</Button>
        <Button size="lg" variant="ghost" fullWidth onClick={() => navigator.share?.({ title: `${me.name} · ${c.title}`, text: `Certified on ${c.title}, valid to ${fmtDate(p.certExpiresAt, true)}` }).catch(() => undefined)}><Share className="size-4" aria-hidden="true" />Share</Button>
      </>}>
      <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-card border-2 border-tint-line bg-tint-2 px-5 py-8 text-center">
        <span className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-tint-strong" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-14 -left-10 size-36 rounded-full bg-sage-bg" aria-hidden="true" />
        <BrandMark size={44} />
        <Text size="caption" weight="bold" tone="brand-deep" uppercase tracking="wider" className="relative">Certificate of readiness</Text>
        <Text size="hero" weight="extrabold" tracking="tight" className="relative leading-tight">{me.name}</Text>
        <Text size="body-lg" tone="muted" className="relative">is certified on</Text>
        <Text size="display" weight="extrabold" className="relative leading-snug">{c.title}</Text>
        <span className="relative rounded-full bg-card px-3 py-1 text-caption font-bold text-ink-2 shadow-hair">Version {p.version}</span>
        <div className="relative mt-3 grid w-full grid-cols-2 gap-2.5 text-left">
          {[["Certified", fmtDate(p.certifiedAt, true)], ["Valid until", fmtDate(p.certExpiresAt, true)], ["Verified by", verifier?.name ?? "Automatic on pass"], ["Issued by", ORG.name]].map(([k, v]) => (
            <div key={k} className="flex flex-col rounded-panel bg-card/80 px-3 py-2.5"><span className="text-caption text-ink-3">{k}</span><strong className="text-body font-bold text-ink">{v}</strong></div>
          ))}
        </div>
        <Text size="micro" tone="faint" className="relative mt-1">Internal training record · fictional prototype data</Text>
      </div>
    </Sheet>
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
