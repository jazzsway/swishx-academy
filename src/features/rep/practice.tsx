"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Lock, Mic, ChevronRight, Trash2, RotateCcw, Flame, X, Check } from "lucide-react"; // v1-hidden: ListChecks, Layers, Share2
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe, fmtDate, daysFromToday } from "@/store/selectors";
import { OBJECTIONS, PREP_CALL_TYPES, PREP_SPECIALTIES, PREP_TRAITS, SCENARIOS, scenario as getScenario } from "@/data/scenarios";
import type { Item, PracticeSession } from "@/data/types";
import { competency } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Ring } from "@/components/patterns/academy";
import { CallScreen } from "@/features/roleplay/call-screen";
import { Scorecard } from "@/features/roleplay/scorecard";
import { BlockView } from "@/features/shared/block-view";

const NAMES = ["Dr. Sam Rivera", "Dr. Priyanka Rao", "Dr. Tom Becker", "Dr. Alicia Moreno", "Dr. Jonah Weiss"];

function personaFor(setup: NonNullable<PracticeSession["setup"]>) {
  const name = NAMES[(setup.specialty.length + setup.traits.length) % NAMES.length];
  const opening = setup.callType === "First call"
    ? "Hi. I don't have long. What's Lumora and why should I care?"
    : setup.callType === "Follow-up" ? "Back again. I've thought about Lumora since last time. I still have questions."
      : "So Lumora's been out a few weeks. Tell me what you're hearing from other offices.";
  return { name, specialty: setup.specialty, setting: "Practice you're visiting this week (simulated)", traits: setup.traits, opening };
}

export function PracticeHub() {
  const me = useMe();
  const s = useApp();
  const mine = s.practice.filter((x) => x.userId === me.id);
  const assigned = s.progress.filter((p) => p.userId === me.id).map((p) => p.courseId);
  const library = SCENARIOS.filter((x) => x.use.includes("practice") && assigned.includes(x.courseId));
  const calls = mine.filter((x) => x.kind === "roleplay"); // v1-hidden: quiz sessions (no quiz in v1)
  const today = calls.filter((x) => x.at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <Text as="h1" size="hero" weight="extrabold" tracking="tight">Practice</Text>
      <div className="squircle flex items-start gap-3 rounded-panel bg-ink p-4 text-white">
        <Lock className="mt-0.5 size-5 shrink-0 text-brand-light" aria-hidden="true" />
        <div className="flex flex-col gap-0.5"><Text size="body-lg" weight="bold" tone="inverse">Private. Only you can see your sessions.</Text>
          <Text size="body" tone="inverse" className="opacity-70">Your trainer sees anonymous team trends only. Sessions delete after {s.settings.practiceRetentionDays} days.</Text></div>
      </div>
      <Link href="/rep/practice/prep" className="squircle flex items-center gap-4 rounded-card bg-brand-deep p-5 text-white">
        <span className="grid size-12 place-items-center rounded-panel bg-white/15"><Mic className="size-6" aria-hidden="true" /></span>
        <div className="flex min-w-0 flex-1 flex-col"><Text size="title" weight="bold" tone="inverse">Prep for a meeting</Text><Text size="body" tone="inverse" className="opacity-85">Rehearse tomorrow's tough conversation with an AI doctor.</Text></div>
        <ChevronRight className="size-5" aria-hidden="true" />
      </Link>
      {/* v1-hidden: quick quiz and flashcards. Practice is the AI-doctor call.
      <div className="grid grid-cols-2 gap-3">
        <Link href="/rep/practice/quiz" className="squircle flex flex-col gap-2 rounded-panel border border-hair bg-card p-4"><ListChecks className="size-6 text-brand-deep" aria-hidden="true" /><Text size="body-lg" weight="bold">Quick quiz</Text><Text size="caption" tone="subtle">5 questions, instant feedback</Text></Link>
        <Link href="/rep/practice/flashcards" className="squircle flex flex-col gap-2 rounded-panel border border-hair bg-card p-4"><Layers className="size-6 text-brand-deep" aria-hidden="true" /><Text size="body-lg" weight="bold">Flashcards</Text><Text size="caption" tone="subtle">Numbers to know</Text></Link>
      </div>
      */}
      <section className="flex flex-col gap-2">
        <Text as="h2" size="subhead" weight="bold">Scenario library</Text>
        {library.map((sc) => (
          <Link key={sc.id} href={`/rep/practice/call?scenario=${sc.id}`} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card p-4">
            <span className="grid size-10 place-items-center rounded-full bg-tint text-body font-bold text-brand-deep">{sc.persona.name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("")}</span>
            <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold">{sc.title}</Text><Text size="caption" tone="subtle">{sc.persona.traits.join(" · ")} · {sc.durationMin} min</Text></div>
            <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
          </Link>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between"><Text as="h2" size="subhead" weight="bold">Your sessions</Text>{today > 0 && <span className="flex items-center gap-1 text-caption font-semibold text-brand-deep"><Flame className="size-3.5" aria-hidden="true" />{today} today</span>}</div>
        {calls.length === 0 && <Text tone="subtle">Nothing yet. Your first session takes 5 minutes.</Text>}
        {calls.map((x) => (
          <Link key={x.id} href={x.kind === "roleplay" ? `/rep/practice/session/${x.id}` : "/rep/practice/quiz"} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
            <Ring value={x.result?.score ?? x.quizScore ?? 0} size={40} stroke={4} label={`${x.result?.score ?? x.quizScore}%`}><Text size="micro" weight="bold">{x.result?.score ?? x.quizScore}</Text></Ring>
            <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold" truncate>{x.title}</Text>
              <Text size="caption" tone="subtle">{fmtDate(x.at)} · deletes in {Math.max(0, daysFromToday(x.deletesAt))} days{/* v1-hidden: x.shared ? " · shared with your manager" : "" */}</Text></div>
          </Link>
        ))}
      </section>
    </div>
  );
}

/** A tougher version of the same call: sharper doctor, one more objection. */
function harden(setup: NonNullable<PracticeSession["setup"]>): NonNullable<PracticeSession["setup"]> {
  const extra = OBJECTIONS.find((o) => !setup.objectionIds.includes(o.id));
  return {
    ...setup,
    traits: [...new Set([...setup.traits, "Sceptical", "Time-pressed"])],
    objectionIds: setup.objectionIds.length < 3 && extra ? [...setup.objectionIds, extra.id] : setup.objectionIds,
  };
}

export function PrepMeeting() {
  const router = useRouter();
  const search = useSearchParams();
  const me = useMe();
  const s = useApp();
  /* "Try again" and "Harder" come back here with the earlier session's setup and start straight away. */
  const from = s.practice.find((p) => p.id === search.get("from") && p.userId === me.id)?.setup;
  const start = from && (search.get("harder") === "1" ? harden(from) : from);
  const [specialty, setSpecialty] = useState(start?.specialty ?? PREP_SPECIALTIES[0]);
  const [traits, setTraits] = useState<string[]>(start?.traits ?? ["Sceptical", "Cost-focused"]);
  const [callType, setCallType] = useState(start?.callType ?? PREP_CALL_TYPES[1]);
  const [objs, setObjs] = useState<string[]>(start?.objectionIds ?? ["ob-cost", "ob-eyes"]);
  const [live, setLive] = useState(!!start);
  const setup = { specialty, traits, objectionIds: objs, callType };
  const base = getScenario("sc-kim");

  if (live)
    return <CallScreen scenario={{ ...base, objective: "Practise the conversation you're expecting. Nothing is graded.", durationMin: 6 }} objectionIds={objs} mode="practice" voiceAllowed={!!s.voiceConsent[me.id]}
      personaOverride={personaFor(setup)} onExit={() => setLive(false)}
      onComplete={(r) => {
        const id = s.addPractice({ userId: me.id, at: new Date().toISOString(), kind: "roleplay", title: `Prep · ${traits.join(", ").toLowerCase()} ${specialty.toLowerCase()}`, setup, result: { transcript: r.transcript, criteria: r.criteria, flags: r.flags, score: r.score, typed: r.typed, durationSec: r.durationSec } });
        s.touchStreak(me.id);
        router.replace(`/rep/practice/session/${id}`);
      }} />;

  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-5">
      <div className="flex items-center gap-3">
        <Link href="/rep/practice" aria-label="Back" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
        <span className="flex items-center gap-1.5 text-caption font-semibold text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Private practice</span>
      </div>
      <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">Who are you meeting?</Text>
      <Text size="body" tone="subtle">Describe the type of doctor, not the person. No names or notes about real HCPs.</Text>
      <Group label="Specialty">{PREP_SPECIALTIES.map((x) => <Chip key={x} size="lg" selected={specialty === x} onClick={() => setSpecialty(x)}>{x}</Chip>)}</Group>
      <Group label="What are they like?">{PREP_TRAITS.map((x) => <Chip key={x} size="lg" selected={traits.includes(x)} onClick={() => setTraits(traits.includes(x) ? traits.filter((t) => t !== x) : [...traits, x])}>{x}</Chip>)}</Group>
      <Group label="Call">{PREP_CALL_TYPES.map((x) => <Chip key={x} size="lg" selected={callType === x} onClick={() => setCallType(x)}>{x}</Chip>)}</Group>
      <Group label={`Objections you expect (${objs.length}/3)`}>
        {OBJECTIONS.map((o) => <Chip key={o.id} size="lg" selected={objs.includes(o.id)} onClick={() => setObjs(objs.includes(o.id) ? objs.filter((x) => x !== o.id) : objs.length < 3 ? [...objs, o.id] : objs)}>{o.label}</Chip>)}
      </Group>
      <Button size="lg" fullWidth className="mt-auto" disabled={!objs.length} onClick={() => setLive(true)}><Mic className="size-4" aria-hidden="true" />Start practice call</Button>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><Text size="label" weight="semibold" tone="muted">{label}</Text><div className="flex flex-wrap gap-2">{children}</div></div>;
}

export function LibraryCall() {
  const search = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const sc = getScenario(search.get("scenario") ?? "sc-kim");
  return <CallScreen scenario={sc} mode="practice" voiceAllowed={!!s.voiceConsent[me.id]} onExit={() => router.push("/rep/practice")}
    onComplete={(r) => {
      const id = s.addPractice({ userId: me.id, at: new Date().toISOString(), kind: "roleplay", title: sc.title, setup: { specialty: sc.persona.specialty, traits: sc.persona.traits, objectionIds: sc.objectionIds, callType: sc.context }, result: { transcript: r.transcript, criteria: r.criteria, flags: r.flags, score: r.score, typed: r.typed, durationSec: r.durationSec } });
      s.touchStreak(me.id);
      router.replace(`/rep/practice/session/${id}`);
    }} />;
}

export function PracticeSessionView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const x = s.practice.find((p) => p.id === id && p.userId === me.id);
  const [shareOpen, setShareOpen] = useState(false);
  const manager = s.users.find((u) => u.id === me.managerId);
  if (!x?.result) return <div className="p-4"><EmptyState title="Session not found" body="It may have been deleted." /></div>;
  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <Link href="/rep/practice" className="self-start text-body font-semibold text-ink-3">← Practice</Link>
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-caption font-semibold text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Private · deletes in {Math.max(0, daysFromToday(x.deletesAt))} days</span>
        <Text as="h1" size="display-lg" weight="extrabold" tracking="tight" className="leading-tight">{x.title}</Text>
      </div>
      <Scorecard result={x.result} mode="practice" approvedHref={(m) => `/rep/course/c-lumora-launch/learn?module=${m}&optional=1`} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" onClick={() => router.push(x.setup ? `/rep/practice/prep?from=${x.id}` : "/rep/practice")}><RotateCcw className="size-4" aria-hidden="true" />Try again</Button>
        <Button variant="secondary" size="lg" disabled={!x.setup} onClick={() => router.push(`/rep/practice/prep?from=${x.id}&harder=1`)}>Make it harder</Button>
      </div>
      {/* v1-hidden: sharing a session with your manager (no managers in v1).
      {x.shared ? (
        <div className="squircle flex items-center justify-between gap-3 rounded-panel bg-ok-bg px-4 py-3">
          <Text size="body" tone="ok" weight="semibold">{x.shared.seen ? `Seen by ${manager?.first}` : `Shared with ${manager?.first}`}</Text>
          {!x.shared.seen && <button type="button" className="text-body font-semibold text-ok underline" onClick={() => s.setPracticeShared(x.id, false)}>Unshare</button>}
        </div>
      ) : <Button variant="soft" size="lg" onClick={() => setShareOpen(true)}><Share2 className="size-4" aria-hidden="true" />Share with my manager</Button>}
      */}
      <Button variant="ghost" onClick={() => { s.deletePractice(x.id); router.replace("/rep/practice"); }}><Trash2 className="size-4" aria-hidden="true" />Delete now</Button>
      {/* v1-hidden: share modal. */}
      <Modal open={false && shareOpen} onClose={() => setShareOpen(false)} title={`Share with ${manager?.name ?? "your manager"}?`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShareOpen(false)}>Cancel</Button><Button onClick={() => { s.setPracticeShared(x.id, true); setShareOpen(false); }}>Share this session</Button></>}>
        <ul className="flex flex-col gap-2 text-body-lg">
          <li className="flex gap-2"><Check className="mt-0.5 size-4 text-ok" aria-hidden="true" />This session's transcript and scorecard</li>
          <li className="flex gap-2"><Check className="mt-0.5 size-4 text-ok" aria-hidden="true" />Nothing else. Your other sessions stay private.</li>
          <li className="flex gap-2"><Check className="mt-0.5 size-4 text-ok" aria-hidden="true" />You can unshare until they open it.</li>
        </ul>
      </Modal>
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
      <div className="flex min-h-full flex-1 flex-col items-center gap-4 px-6 pb-8 pt-16 text-center">
        <Ring value={(score / pool.length) * 100} size={96} stroke={9} label="Quiz score"><Text size="hero" weight="extrabold">{score}/{pool.length}</Text></Ring>
        <Text as="h1" size="hero" weight="extrabold">{score === pool.length ? "Perfect" : "Nice work"}</Text>
        <Text tone="muted" size="body-lg">Practice only. Nobody else sees this.</Text>
        <div className="mt-auto flex w-full flex-col gap-2">
          <Button size="lg" fullWidth onClick={() => { setRound(round + 1); setI(0); setPicked(null); setScore(0); setDone(false); }}>Another 5</Button>
          <Link href="/rep/practice" className="py-2 text-center text-body-lg font-semibold text-ink-2">Back to practice</Link>
        </div>
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
            else { setDone(true); s.addPractice({ userId: me.id, at: new Date().toISOString(), kind: "quiz", title: "Quick quiz", quizScore: Math.round((score / pool.length) * 100) }); s.touchStreak(me.id); }
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
