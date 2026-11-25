"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Lock, Mic, Trash2, RotateCcw, Flame, X, AudioLines, Stethoscope, Syringe, Pill, Briefcase, UserRound } from "lucide-react"; // v1-hidden: ListChecks, Layers, Share2
import { cn } from "@/lib/cn";
import { nowIso, useApp } from "@/store/app-store";
import { useMe, daysFromToday } from "@/store/selectors";
import { OBJECTIONS, PREP_CALL_TYPES, PREP_SPECIALTIES, PREP_TRAITS, allScenarios, registerExtraObjections, scenario as getScenario } from "@/data/scenarios";
import { situationObjection } from "@/lib/roleplay-draft";
import type { Item, PracticeSession } from "@/data/types";
import { competency, PRODUCTS } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ScreenTop, BottomBar } from "@/features/shell/screen-chrome";
import { Chip } from "@/components/ui/chip";
import { EmptyState, Ring } from "@/components/patterns/academy";
import { CallScreen } from "@/features/roleplay/call-screen";
import { BlockView } from "@/features/shared/block-view";
import { PracticeHero } from "./hero-visuals";
import { objectiveBank, objectiveCall } from "@/lib/objective-call";
import { coverageOf } from "./situations";
import { PracticeCallTabs } from "./session-replay";

/* ── Who you can rehearse with ────────────────────────────────────────────── */

type Role = "doctor" | "nurse" | "pharmacist" | "manager";
const ROLES: { id: Role; label: string; names: string[]; specialty?: string }[] = [
  { id: "doctor", label: "Doctor", names: ["Dr. Sam Rivera", "Dr. Priyanka Rao", "Dr. Alicia Moreno", "Dr. Jonah Weiss"] },
  { id: "nurse", label: "Nurse", names: ["Nurse Tom Becker", "Nurse Grace Obi"], specialty: "Dermatology nurse" },
  { id: "pharmacist", label: "Pharmacist", names: ["Mei Lin, PharmD", "Sam Patel, PharmD"], specialty: "Specialty pharmacist" },
  { id: "manager", label: "Practice manager", names: ["Dana Whitfield", "Luis Romero"], specialty: "Practice manager" },
];
const ROLE_ICON: Record<string, typeof Stethoscope> = { doctor: Stethoscope, nurse: Syringe, pharmacist: Pill, manager: Briefcase, patient: UserRound };
const LENGTHS = [3, 5, 8];
const initialsOf = (name: string) => name.replace(/^(Dr\.|Nurse)\s*/, "").replace(/,.*$/, "").split(" ").map((x) => x[0]).join("").slice(0, 2);
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, "0")}`;

function personaFor(setup: NonNullable<PracticeSession["setup"]>, brand: string) {
  const role = ROLES.find((r) => r.id === (setup.role ?? "doctor")) ?? ROLES[0];
  const name = setup.persona ?? role.names[(setup.specialty.length + setup.traits.length) % role.names.length];
  const opening = setup.callType === "First call"
    ? `Hi. I don't have long. What's ${brand} and why should I care?`
    : setup.callType === "Follow-up" ? `Back again. I've thought about ${brand} since last time. I still have questions.`
      : `So ${brand}'s been out a few weeks. Tell me what you're hearing from other offices.`;
  return { name, specialty: role.id === "doctor" ? setup.specialty : role.specialty!, setting: "Practice you're visiting this week (simulated)", traits: setup.traits, opening };
}

/** The usual objections, in the chosen product's name. Lumora's are the originals; others are copies with the name swapped. */
function objectionsFor(ids: string[], brand: string) {
  if (brand === "Lumora") return { ids, extra: [] as typeof OBJECTIONS };
  const extra = OBJECTIONS.filter((o) => ids.includes(o.id)).map((o) => {
    const swap = (t: string) => t.replace(/Lumora/g, brand);
    return { ...o, id: `${o.id}@${brand}`, line: swap(o.line), pushback: swap(o.pushback), handled: swap(o.handled) };
  });
  return { ids: ids.map((id) => (OBJECTIONS.some((o) => o.id === id) ? `${id}@${brand}` : id)), extra };
}

const dayLabel = (iso: string) => {
  const d = daysFromToday(iso.slice(0, 10));
  return d === 0 ? "Today" : d === -1 ? "Yesterday" : new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

/** v1-hidden: practising situations from your trainings, the practice stats, "work on next" and the past-call filters. Practice is just: start a call, and your past calls. */
const EXTRAS = false;

/**
 * Practice: voice calls to rehearse, separate from asking SwishX in Chat. Start a call you set up (who,
 * product, mood, what they'll push back on), or practise a situation from your trainings. Every call
 * is kept privately, with its scorecard and full transcript, to look back on and try again.
 */
export function PracticeHub() {
  const me = useMe();
  const s = useApp();
  const [show, setShow] = useState<"all" | "rehearsal" | "training">("all");
  const mine = s.practice.filter((x) => x.userId === me.id);
  const calls = mine.filter((x) => x.kind === "roleplay").sort((a, b) => b.at.localeCompare(a.at)); // v1-hidden: quiz sessions (no quiz in v1)
  const scored = calls.filter((x) => x.result);
  const weekAgo = new Date(new Date(nowIso()).getTime() - 7 * 86400_000).toISOString();
  const thisWeek = calls.filter((x) => x.at >= weekAgo).length;
  const avg = scored.length ? Math.round(scored.reduce((a, x) => a + x.result!.score, 0) / scored.length) : undefined;
  const best = scored.length ? Math.max(...scored.map((x) => x.result!.score)) : undefined;
  /* What keeps getting missed in recent calls: the coaching to come back to. */
  const missed = new Map<string, number>();
  for (const x of scored.slice(0, 5)) for (const c of x.result!.criteria) if (!c.met) missed.set(c.label, (missed.get(c.label) ?? 0) + 1);
  const workOn = [...missed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  /* Situations from the trainings assigned to you, one per objective you haven't passed yet. */
  const fromTrainings = useMemo(() => {
    const out: { sc: ReturnType<typeof allScenarios>[number]; course: string; objective?: string }[] = [];
    for (const p of s.progress.filter((x) => x.userId === me.id && x.state !== "certified")) {
      const c = s.courses.find((x) => x.id === p.courseId);
      if (!c || c.origin !== "direct") continue;
      /* One per training, so each training you're on is there to practise. */
      for (const ob of c.objectives ?? []) {
        const sc = allScenarios().find((x) => c.scenarioIds.includes(x.id) && x.objectiveId === ob.id && !x.use.includes("screening"));
        if (sc && !p.scenarioRuns?.[sc.id]?.passed) { out.push({ sc, course: c.title, objective: ob.title }); break; }
      }
      if (out.length >= 4) return out;
    }
    return out;
  }, [s.progress, s.courses, me.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = calls.filter((x) => show === "all" || (x.setup?.source ?? "rehearsal") === show);
  const days = [...new Set(shown.map((x) => dayLabel(x.at)))];

  return (
    <div className="flex flex-col gap-6 px-4 pb-4 pt-5">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">Practice</Text>
          <Text size="body" tone="subtle">Voice calls to rehearse before the real one.</Text>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-caption font-bold text-white"><Lock className="size-3" aria-hidden="true" />Private</span>
      </header>

      <PracticeHero initials={me.initials} />

      {EXTRAS && fromTrainings.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between"><Text as="h2" size="title" weight="bold">From your trainings</Text><Text size="caption" tone="subtle">Not scored for the record</Text></div>
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {fromTrainings.map(({ sc, course, objective }) => {
              const I = ROLE_ICON[sc.character ?? "doctor"] ?? Stethoscope;
              return (
                <Link key={sc.id} href={`/rep/practice/call?scenario=${sc.id}`} className="flex w-[248px] shrink-0 snap-start flex-col gap-2.5 rounded-card bg-card p-4 shadow-hair transition-transform active:scale-[0.98]">
                  <span className="flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-full bg-sage-bg text-ok"><I className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1 truncate text-caption font-semibold text-ink-3">{course}</span>
                  </span>
                  <Text size="body-lg" weight="bold" className="line-clamp-2 leading-snug">{objective ?? sc.title}</Text>
                  <Text size="caption" tone="subtle" className="line-clamp-2">{sc.title} · {sc.persona.name.replace(/,.*$/, "")}</Text>
                  <span className="mt-auto flex items-center gap-1.5 text-caption font-bold text-brand-deep"><Mic className="size-3.5" aria-hidden="true" />Practise it · {sc.durationMin} min</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {EXTRAS && <section aria-label="Your practice" className="grid grid-cols-3 gap-2.5">
        {[
          { label: "This week", value: thisWeek, sub: thisWeek === 1 ? "call" : "calls", tile: "bg-lilac" },
          { label: "Average", value: avg ?? "–", sub: avg !== undefined ? "score" : "no calls yet", tile: "bg-sage" },
          { label: "Best", value: best ?? "–", sub: best !== undefined ? "score" : "no calls yet", tile: "bg-peach" },
        ].map((t) => (
          <div key={t.label} className={cn("flex flex-col gap-1 rounded-panel px-3.5 py-3.5 text-white shadow-soft", t.tile)}>
            <span className="text-caption font-bold text-white/90">{t.label}</span>
            <span className="text-display-lg font-extrabold leading-none tabular-nums">{t.value}</span>
            <span className="text-caption font-semibold text-white/85">{t.sub}</span>
          </div>
        ))}
      </section>}

      {EXTRAS && workOn.length > 0 && (
        <section className="flex flex-col gap-2.5 rounded-card bg-tint p-4">
          <div className="flex items-center gap-2"><Flame className="size-4 text-brand-deep" aria-hidden="true" /><Text size="body-lg" weight="bold">Work on next</Text></div>
          <Text size="caption" tone="muted" className="-mt-1.5">What your recent calls missed most often.</Text>
          <ul className="flex flex-col gap-1.5">
            {workOn.map(([label, n]) => (
              <li key={label} className="flex items-center gap-2.5 rounded-control bg-white/70 px-3 py-2">
                <X className="size-4 shrink-0 text-brand" aria-hidden="true" />
                <span className="flex-1 text-body font-semibold text-ink">{label}</span>
                <span className="text-caption text-ink-3">missed {n}×</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><Text as="h2" size="title" weight="bold">Past calls</Text>{calls.length > 0 && <Text size="caption" tone="subtle">{calls.length} · private</Text>}</div>
        {EXTRAS && calls.length > 0 && (
          <div className="flex gap-2">
            {([["all", "All"], ["rehearsal", "Rehearsals"], ["training", "From trainings"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setShow(k)} aria-pressed={show === k}
                className={cn("h-9 rounded-full px-3.5 text-caption font-bold transition-colors", show === k ? "bg-ink text-white" : "bg-card text-ink-2 shadow-hair")}>{l}</button>
            ))}
          </div>
        )}
        {calls.length === 0 && (
          <div className="squircle flex flex-col items-center gap-2 rounded-card border border-dashed border-hair-2 px-6 py-8 text-center">
            <AudioLines className="size-6 text-ink-4" aria-hidden="true" />
            <Text size="body-lg" weight="semibold">No calls yet</Text>
            <Text size="body" tone="subtle">Your first call takes about 5 minutes. You&apos;ll get a scorecard and the transcript straight after.</Text>
          </div>
        )}
        {calls.length > 0 && !shown.length && <Text size="body" tone="subtle">None of these yet.</Text>}
        {days.map((d) => (
          <div key={d} className="flex flex-col gap-2">
            <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">{d}</Text>
            {shown.filter((x) => dayLabel(x.at) === d).map((x) => {
              const I = ROLE_ICON[x.setup?.role ?? "doctor"] ?? Stethoscope;
              const score = x.result?.score ?? 0;
              return (
                <Link key={x.id} href={`/rep/practice/session/${x.id}`} className="flex items-center gap-3 rounded-card bg-card px-3.5 py-3 shadow-hair transition-transform active:scale-[0.99]">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-subtle text-ink-2"><I className="size-5" aria-hidden="true" /></span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Text size="body" weight="bold" truncate>{x.title}</Text>
                    <Text size="caption" tone="subtle" truncate>
                      {new Date(x.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}{x.result ? ` · ${mmss(x.result.durationSec)}` : ""}{x.setup?.source === "training" ? " · from a training" : ""}{x.setup?.assisted ? " · assisted" : ""}
                    </Text>
                  </div>
                  {x.result
                    ? <Ring value={score} size={42} stroke={4} tone={score >= 75 ? "ok" : "brand"} label={`${score}%`}><Text size="caption" weight="bold" tabular>{score}</Text></Ring>
                    : <span className="text-caption text-ink-4">Not finished</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </section>

      <Text size="caption" tone="subtle" className="flex items-start gap-1.5 px-1">
        <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />Only you can see your calls. Your trainer sees anonymous team trends only. Calls delete after {s.settings.practiceRetentionDays} days.
      </Text>
    </div>
  );
}

/** A tougher version of the same call: sharper doctor, one more objection. */
function harden(setup: NonNullable<PracticeSession["setup"]>): NonNullable<PracticeSession["setup"]> {
  const extra = OBJECTIONS.find((o) => !setup.objectionIds.some((x) => x.split("@")[0] === o.id));
  return {
    ...setup,
    traits: [...new Set([...setup.traits, "Sceptical", "Time-pressed"])],
    objectionIds: setup.objectionIds.length < 3 && extra ? [...setup.objectionIds.map((x) => x.split("@")[0]), extra.id] : setup.objectionIds.map((x) => x.split("@")[0]),
  };
}

/** Setting up a practice call: who, which product, what they're like, what they'll push on, how long, and how much help. */
export function PrepMeeting() {
  const router = useRouter();
  const search = useSearchParams();
  const me = useMe();
  const s = useApp();
  /* "Try again" and "Harder" come back here with the earlier session's setup and start straight away. */
  const from = s.practice.find((p) => p.id === search.get("from") && p.userId === me.id)?.setup;
  const start = from && (search.get("harder") === "1" ? harden(from) : from);
  const products = PRODUCTS.filter((p) => p.divisionId === (me.divisionId ?? "div-imm") && p.status !== "Awaiting approval");
  const [role, setRole] = useState<Role>((start?.role as Role) ?? "doctor");
  const [productId, setProductId] = useState(start?.productId ?? products[0]?.id ?? "p-lumora");
  const [specialty, setSpecialty] = useState(start?.specialty ?? PREP_SPECIALTIES[0]);
  const [traits, setTraits] = useState<string[]>(start?.traits ?? ["Sceptical", "Cost-focused"]);
  const [callType, setCallType] = useState(start?.callType ?? PREP_CALL_TYPES[1]);
  const [objs, setObjs] = useState<string[]>(start?.objectionIds.filter((x) => x !== "ob-own").map((x) => x.split("@")[0]) ?? ["ob-cost", "ob-eyes"]);
  const [situation, setSituation] = useState(start?.situation ?? "");
  const [minutes, setMinutes] = useState(start?.minutes ?? 5);
  const [assisted, setAssisted] = useState(start?.assisted ?? true);
  const [live, setLive] = useState(!!start);
  const brand = PRODUCTS.find((p) => p.id === productId)?.brand ?? "Lumora";
  /* The rep's own situation becomes the person's first objection, for this call only; the rest speak the product's name. */
  const own = situation.trim().length > 8 ? situationObjection(situation) : undefined;
  const branded = objectionsFor(objs, brand);
  useEffect(() => { registerExtraObjections([...(own ? [own] : []), ...branded.extra]); }, [own?.line, brand, objs.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const callObjs = own ? ["ob-own", ...branded.ids.slice(0, 2)] : branded.ids;
  const setup: NonNullable<PracticeSession["setup"]> = { specialty, traits, objectionIds: callObjs, callType, assisted, situation: own ? situation.trim() : undefined, role, productId, minutes, source: "rehearsal" };
  const persona = personaFor(setup, brand);
  const base = getScenario("sc-kim");

  if (live)
    return <CallScreen scenario={{ ...base, objective: own ? "Practise the conversation you described. Nothing is graded." : "Practise the conversation you're expecting. Nothing is graded.", durationMin: minutes }} objectionIds={callObjs} mode="practice" voiceAllowed={!!s.voiceConsent[me.id]}
      personaOverride={persona} onExit={() => setLive(false)} assisted={assisted}
      onComplete={(r, meta) => {
        const id = s.addPractice({ userId: me.id, at: nowIso(), kind: "roleplay", title: `${persona.name.replace(/,.*$/, "")} · ${callType.toLowerCase()}`, setup: { ...setup, assisted: meta.assisted, persona: persona.name }, result: { transcript: r.transcript, criteria: r.criteria, flags: r.flags, score: r.score, typed: r.typed, durationSec: r.durationSec } });
        s.touchStreak(me.id);
        router.replace(`/rep/practice/session/${id}`);
      }} />;

  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pt-5">
      <ScreenTop title="Set up your call"
        leading={<Link href="/rep/practice" aria-label="Close" className="focus-ring grid size-11 shrink-0 place-items-center rounded-full border border-hair-3 bg-card/60"><X className="size-5" /></Link>}
        eyebrow={<span className="flex items-center gap-1.5 text-caption font-semibold text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Private practice</span>}
        sub={<Text size="body" tone="subtle" className="-mt-2">Describe the type of person, not a real one. No names or notes about real HCPs.</Text>} />
      <Group label="Who are you meeting?">{ROLES.map((r) => { const I = ROLE_ICON[r.id]; return <Chip key={r.id} size="lg" selected={role === r.id} onClick={() => setRole(r.id)} iconLeft={<I className="size-4" aria-hidden="true" />}>{r.label}</Chip>; })}</Group>
      {role === "doctor" && <Group label="Specialty">{PREP_SPECIALTIES.map((x) => <Chip key={x} size="lg" selected={specialty === x} onClick={() => setSpecialty(x)}>{x}</Chip>)}</Group>}
      {products.length > 1 && <Group label="Product">{products.map((p) => <Chip key={p.id} size="lg" selected={productId === p.id} onClick={() => setProductId(p.id)}>{p.brand}</Chip>)}</Group>}
      <Group label="What are they like?">{PREP_TRAITS.map((x) => <Chip key={x} size="lg" selected={traits.includes(x)} onClick={() => setTraits(traits.includes(x) ? traits.filter((t) => t !== x) : [...traits, x])}>{x}</Chip>)}</Group>
      <Group label="Call">{PREP_CALL_TYPES.map((x) => <Chip key={x} size="lg" selected={callType === x} onClick={() => setCallType(x)}>{x}</Chip>)}</Group>
      <Group label={`Objections you expect (${objs.length}/3)`}>
        {OBJECTIONS.map((o) => <Chip key={o.id} size="lg" selected={objs.includes(o.id)} onClick={() => setObjs(objs.includes(o.id) ? objs.filter((x) => x !== o.id) : objs.length < 3 ? [...objs, o.id] : objs)}>{o.label}</Chip>)}
      </Group>
      <div className="flex flex-col gap-2">
        <label htmlFor="own-situation" className="text-label font-semibold text-ink-2">Bring your own situation <span className="font-normal text-ink-3">(optional)</span></label>
        <textarea id="own-situation" rows={3} value={situation} onChange={(e) => setSituation(e.target.value)}
          placeholder="e.g. She only gives me two minutes at the door and says she's happy with what she prescribes."
          className="squircle min-h-[84px] resize-none rounded-control border border-hair-2 bg-card px-3.5 py-3 text-body-lg outline-none transition-colors placeholder:text-ink-4 focus:border-brand" />
        {own && <Text size="caption" tone="brand-deep" weight="semibold">They open with this: “{own.line}”</Text>}
      </div>
      <Group label="How long?">{LENGTHS.map((m) => <Chip key={m} size="lg" selected={minutes === m} onClick={() => setMinutes(m)}>{m} min</Chip>)}</Group>
      <div className="flex flex-col gap-2">
        <Text size="label" weight="semibold" tone="muted">How much help?</Text>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Assisted or unassisted">
          {[{ on: true, label: "Assisted", hint: "Prompts while you talk" }, { on: false, label: "Unassisted", hint: "A clean call, scored after" }].map((o) => (
            <button key={o.label} type="button" role="radio" aria-checked={assisted === o.on} onClick={() => setAssisted(o.on)}
              className={cn("squircle flex flex-col gap-0.5 rounded-panel border p-3 text-left transition-colors", assisted === o.on ? "border-brand bg-tint ring-1 ring-brand" : "border-hair-2 bg-card hover:bg-subtle")}>
              <span className="text-body-lg font-bold text-ink">{o.label}</span><span className="text-caption text-ink-3">{o.hint}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Who picks up, before you call. */}
      <div className="flex items-center gap-3 rounded-card bg-card p-3.5 shadow-hair">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-peach text-body font-extrabold text-white">{initialsOf(persona.name)}</span>
        <span className="flex min-w-0 flex-1 flex-col"><Text size="body" weight="bold" truncate>{persona.name}</Text><Text size="caption" tone="subtle" truncate>{persona.specialty} · {traits.join(", ").toLowerCase() || "no particular mood"} · {minutes} min</Text></span>
      </div>
      <BottomBar><Button size="lg" fullWidth disabled={!callObjs.length} onClick={() => setLive(true)}><Mic className="size-4" aria-hidden="true" />Start the call</Button></BottomBar>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><Text size="label" weight="semibold" tone="muted">{label}</Text><div className="flex flex-wrap gap-2">{children}</div></div>;
}

/** A situation from one of your trainings, practised: the same person and moments, kept privately, not scored for the record. */
export function LibraryCall() {
  const search = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  /* From a training's objective: its course and objective ride along, so the call can come back to it. */
  const course = s.courses.find((c) => c.id === search.get("course"));
  const ob = course?.objectives?.find((o) => o.id === search.get("ob"));
  const back = course && ob ? `/rep/course/${course.id}?ob=${ob.id}` : "/rep/practice";
  /* An objective with no situations practises on its own call, made on demand. */
  const sc = getScenario(search.get("scenario") ?? "sc-kim") ?? (course && ob ? objectiveCall(course, ob) : getScenario("sc-kim"));
  return <CallScreen scenario={sc} mode="practice" voiceAllowed={!!s.voiceConsent[me.id]} onExit={() => router.push(back)} assisted
    onComplete={(r, meta) => {
      const id = s.addPractice({ userId: me.id, at: nowIso(), kind: "roleplay", title: sc.title, setup: { specialty: sc.persona.specialty, traits: sc.persona.traits, objectionIds: sc.objectionIds, callType: sc.context, assisted: meta.assisted, role: sc.character, persona: sc.persona.name, minutes: sc.durationMin, source: "training", courseId: course?.id ?? sc.courseId, scenarioId: sc.id }, result: { transcript: r.transcript, criteria: r.criteria, flags: r.flags, score: r.score, typed: r.typed, durationSec: r.durationSec } });
      s.touchStreak(me.id);
      /* Always the scorecard first; from an objective, it leads back to the objective. */
      router.replace(`/rep/practice/session/${id}${course && ob ? `?back=${encodeURIComponent(back)}` : ""}`);
    }} />;
}

/**
 * One past practice call: who it was with and how it went, then its scorecard, the full transcript (what
 * was said, when, what counted and what was flagged) and the setup it ran on. Try it again, or harder.
 */
export function PracticeSessionView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const search = useSearchParams();
  const x = s.practice.find((p) => p.id === id && p.userId === me.id);
  if (!x?.result) return <div className="p-4"><EmptyState title="Call not found" body="It may have been deleted." /></div>;
  const r = x.result;
  const st = x.setup;
  const who = st?.persona ?? x.title.split(" · ")[0];
  const course = st?.courseId ? s.courses.find((c) => c.id === st.courseId) : undefined;
  const verdict = r.score >= 75 ? "Strong call" : r.score >= 60 ? "Getting there" : "Keep practising";
  /* From a training's objective: where it stands now, and the next situation to practise. */
  const back = search.get("back");
  const obj = course?.objectives?.find((o) => o.id === (allScenarios().find((y) => y.id === st?.scenarioId)?.objectiveId ?? st?.scenarioId?.replace(`sc-ob-${course?.id}-`, "")));
  const cov = course && obj ? coverageOf(course, me.id, objectiveBank(course, obj, allScenarios().filter((y) => course.scenarioIds.includes(y.id))), s.practice) : undefined;
  const again = course && obj && cov ? `/rep/practice/call?scenario=${cov.next.id}&course=${course.id}&ob=${obj.id}` : st?.source === "training" && st.scenarioId ? `/rep/practice/call?scenario=${st.scenarioId}` : st ? `/rep/practice/prep?from=${x.id}` : "/rep/practice";
  const I = ROLE_ICON[st?.role ?? "doctor"] ?? Stethoscope;
  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-4 pt-5">
      <div className="flex items-center gap-3.5">
        <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-peach text-title font-extrabold text-white">
          {initialsOf(who)}
          <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full bg-ink text-white ring-2 ring-canvas"><I className="size-3" aria-hidden="true" /></span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-caption font-semibold text-ink-3"><Lock className="size-3" aria-hidden="true" />Private · deletes in {Math.max(0, daysFromToday(x.deletesAt))} days</span>
          <Text as="h1" size="display" weight="extrabold" tracking="tight" className="leading-tight">{x.title}</Text>
          <Text size="caption" tone="subtle">{dayLabel(x.at)}, {new Date(x.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {st?.assisted ? "assisted" : "unassisted"}{course ? ` · from ${course.title}` : ""}</Text>
          <Text size="caption" weight="bold" className={r.score >= 75 ? "text-ok" : r.score >= 60 ? "text-warn" : "text-danger"}>{verdict}</Text>
          {cov && obj && <Text size="caption" weight="semibold" tone="brand-deep">{obj.title} · {r.transcript.some((t) => t.speaker === "rep") ? `${cov.pct}% covered${cov.pct >= 100 ? " · final assessment open" : ""}` : "nothing said, so it doesn't count"}</Text>}
        </div>
      </div>

      <PracticeCallTabs x={x} />

      <button type="button" onClick={() => { s.deletePractice(x.id); router.replace("/rep/practice"); }} className="flex items-center gap-1.5 self-center text-body font-semibold text-ink-3 hover:text-danger"><Trash2 className="size-4" aria-hidden="true" />Delete this call</button>
      <BottomBar inset={4}>
        {back && course && obj ? (
          <>
            <Button size="lg" fullWidth onClick={() => router.push(back)}>Back to the objective</Button>
            <Button variant="ghost" fullWidth onClick={() => router.push(again)}><RotateCcw className="size-4" aria-hidden="true" />{cov && cov.pct < 100 ? "Practise the next situation" : "Practise again"}</Button>
          </>
        ) : (
          <>
            <Button size="lg" fullWidth onClick={() => router.push(again)}><RotateCcw className="size-4" aria-hidden="true" />Try again</Button>
            {st && st.source !== "training" && <Button variant="ghost" fullWidth onClick={() => router.push(`/rep/practice/prep?from=${x.id}&harder=1`)}>Make it harder</Button>}
          </>
        )}
      </BottomBar>
    </div>
  );
}

export function QuickQuiz() {
  const me = useMe();
  const s = useApp();
  const [round, setRound] = useState(0);
  const pool = useMemo(() => {
    const ids = s.progress.filter((p) => p.userId === me.id).map((p) => p.courseId);
    const all: Item[] = s.courses.filter((c) => ids.includes(c.id)).flatMap((c) => c.items.filter((i) => i.pool === "practice"));
    return all.sort(() => Math.random() - 0.5).slice(0, 5);
  }, [s.courses, s.progress, me.id, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  if (!pool.length) return <div className="p-4"><EmptyState title="No practice questions yet" /></div>;
  const q = pool[i];
  if (done)
    return (
      <div className="flex min-h-full flex-1 flex-col items-center gap-4 px-6 pt-16 text-center">
        <Ring value={(score / pool.length) * 100} size={96} stroke={9} label="Quiz score"><Text size="hero" weight="extrabold">{score}/{pool.length}</Text></Ring>
        <Text as="h1" size="hero" weight="extrabold">{score === pool.length ? "Perfect" : "Nice work"}</Text>
        <Text tone="muted" size="body-lg">Practice only. Nobody else sees this.</Text>
        <BottomBar inset={6} className="self-stretch">
          <Button size="lg" fullWidth onClick={() => { setRound(round + 1); setI(0); setPicked(null); setScore(0); setDone(false); }}>Another 5</Button>
          <Link href="/rep/practice" className="py-2 text-center text-body-lg font-semibold text-ink-2">Back to practice</Link>
        </BottomBar>
      </div>
    );
  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-5">
      <div className="flex items-center justify-between"><Link href="/rep/practice" className="text-body font-semibold text-ink-3">← Practice</Link><Text size="caption" tone="subtle">{i + 1} of {pool.length}</Text></div>
      <Chip size="sm" className="self-start">{competency(q.competency)?.name}</Chip>
      <Text as="h1" size="display" weight="bold" className="leading-snug">{q.question}</Text>
      <div className="flex flex-col gap-2.5">
        {q.options.map((o, k) => (
          <button key={k} type="button" disabled={picked !== null} onClick={() => { setPicked(k); if (k === q.answer) setScore(score + 1); }}
            className={cn("squircle min-h-[52px] rounded-control border px-4 py-3 text-left text-subhead", picked === null ? "border-hair-2 bg-card hover:border-brand" : k === q.answer ? "border-ok bg-ok-bg font-semibold text-ok" : picked === k ? "border-danger bg-danger-bg text-danger" : "border-hair-2 bg-card opacity-60")}>{o}</button>
        ))}
      </div>
      {picked !== null && (
        <>
          <div className={cn("squircle rounded-panel px-4 py-3", picked === q.answer ? "bg-ok-bg" : "bg-warn-bg")}><Text size="body-lg">{q.rationale}</Text></div>
          <Button size="lg" fullWidth onClick={() => {
            if (i < pool.length - 1) { setI(i + 1); setPicked(null); }
            else { setDone(true); s.addPractice({ userId: me.id, at: nowIso(), kind: "quiz", title: "Quick quiz", quizScore: Math.round((score / pool.length) * 100) }); s.touchStreak(me.id); }
          }}>{i < pool.length - 1 ? "Next" : "See score"}</Button>
        </>
      )}
    </div>
  );
}

export function Flashcards() {
  const me = useMe();
  const s = useApp();
  const ids = s.progress.filter((p) => p.userId === me.id).map((p) => p.courseId);
  const cards = s.courses.filter((c) => ids.includes(c.id)).flatMap((c) => c.modules.flatMap((m) => m.blocks.filter((b) => b.type === "flashcards").map((b) => ({ b, c }))));
  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-5">
      <Link href="/rep/practice" className="self-start text-body font-semibold text-ink-3">← Practice</Link>
      <Text as="h1" size="hero" weight="extrabold" tracking="tight">Flashcards</Text>
      {cards.map(({ b, c }) => (
        <section key={b.id} className="flex flex-col gap-2"><Text size="body-lg" weight="bold">{b.title}</Text><BlockView block={b} sourceIds={c.sourceIds} interactive /></section>
      ))}
    </div>
  );
}
