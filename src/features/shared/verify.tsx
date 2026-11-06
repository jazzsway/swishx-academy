"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pause, Play, CircleCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live, current } from "@/store/app-store";
import { daysFromToday, fmtDate } from "@/store/selectors";
import { scenario as getScenario } from "@/data/scenarios";
import { COMPETENCIES, competency } from "@/data/org";
import type { Progress, RoleplayResult } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { PageHeading } from "@/components/patterns/page-heading";
import { Card, Avatar, EmptyState, BandChip } from "@/components/patterns/academy";
import { Scorecard } from "@/features/roleplay/scorecard";
import { seededCall } from "@/features/roleplay/engine";

export function callFor(p: Progress): RoleplayResult | undefined {
  const last = p.attempts.filter((a) => a.passed).at(-1) ?? p.attempts.at(-1);
  if (last?.call) return last.call;
  if (!last) return undefined;
  return seededCall(getScenario("sc-kim"), "", p.id.charCodeAt(p.id.length - 1) % 3 !== 0);
}

export function VerifyQueue({ viewer }: { viewer: "manager" | "trainer" }) {
  const s = useApp();
  const me = viewer === "manager" ? "u-david" : "u-maya";
  const users = new Map(s.users.map((u) => [u.id, u]));
  const queue = s.progress
    .filter((p) => p.state === "awaiting_verify" && (viewer === "manager" ? users.get(p.userId)?.managerId === me : -daysFromToday(p.verify!.requestedAt) > 5))
    .sort((a, b) => a.verify!.requestedAt.localeCompare(b.verify!.requestedAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title={viewer === "manager" ? "Verify" : "Verifications waiting on managers"}
        description={viewer === "manager" ? "Reps who passed and need your sign-off before they're certified. Oldest first." : "Waiting more than 5 days. You can verify on the manager's behalf; it's logged as a delegate decision."} />
      {queue.length === 0 ? <EmptyState icon={<ShieldCheck className="size-5" />} title="Nothing waiting" body="When a rep passes an assessment that needs sign-off, it lands here." /> : (
        <div className="flex flex-col gap-2.5">
          {queue.map((p) => {
            const u = users.get(p.userId)!;
            const course = s.courses.find((c) => c.id === p.courseId)!;
            const waited = -daysFromToday(p.verify!.requestedAt);
            const att = p.attempts.filter((a) => a.passed).at(-1);
            return (
              <Link key={p.id} href={`/${viewer}/verify/${p.id}`} className="squircle flex flex-wrap items-center gap-4 rounded-card border border-hair bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft">
                <Avatar initials={u.initials} size={44} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Text size="subhead" weight="bold">{u.name}</Text>
                  <Text size="body" tone="subtle">{course.title} · {s.districts.find((d) => d.id === u.districtId)?.name}{viewer === "trainer" ? ` · manager ${users.get(u.managerId ?? "")?.name}` : ""}</Text>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Text size="body" weight="semibold">Quiz {att?.quiz}% · call {att?.roleplay ?? callFor(p)?.score}%</Text>
                  <Chip size="sm" tone={waited > 5 ? "danger" : "warn"}>{waited === 0 ? "Today" : `Waiting ${waited} day${waited === 1 ? "" : "s"}`}</Chip>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VerifyReview({ progressId, viewer }: { progressId: string; viewer: "manager" | "trainer" }) {
  const router = useRouter();
  const s = useApp();
  const p = s.progress.find((x) => x.id === progressId);
  const call = useMemo(() => (p ? callFor(p) : undefined), [p]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5);
  const [pos, setPos] = useState(0);
  const [decision, setDecision] = useState<"approve" | "coach">("approve");
  const [note, setNote] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [done, setDone] = useState<null | "approve" | "coach">(null);
  const duration = call?.durationSec ?? 90;

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setPos((x) => { const n = x + speed * 0.25; if (n >= duration) { setPlaying(false); return duration; } return n; }), 250);
    return () => window.clearInterval(t);
  }, [playing, speed, duration]);

  if (!p || !call) return <EmptyState title="Nothing to review" />;
  const u = s.users.find((x) => x.id === p.userId)!;
  const course = s.courses.find((c) => c.id === p.courseId)!;
  const att = p.attempts.filter((a) => a.passed).at(-1) ?? p.attempts.at(-1)!;
  const me = viewer === "manager" ? "u-david" : "u-maya";
  const curTurn = [...call.transcript].reverse().find((t) => t.at <= pos);
  const comps = (live(course) ?? current(course)).modules.map((m) => m.competency).filter((c, i, a) => a.indexOf(c) === i);
  const next = s.progress.find((x) => x.id !== p.id && x.state === "awaiting_verify" && (viewer === "manager" ? s.users.find((uu) => uu.id === x.userId)?.managerId === me : true));

  if (done)
    return (
      <div className="mx-auto flex max-w-[560px] flex-col items-center gap-4 py-16 text-center">
        <div className="success-pop grid size-16 place-items-center rounded-full bg-ok-bg text-ok"><CircleCheck className="size-8" aria-hidden="true" /></div>
        <Text as="h1" size="display-lg" weight="extrabold">{done === "approve" ? `${u.first} is certified` : `Sent back to ${u.first} with coaching`}</Text>
        <Text size="body-lg" tone="muted">{done === "approve" ? `${course.title} · v${p.version}. ${u.first} gets their certificate and badge now.` : `A remediation path on ${focus.map((f) => competency(f)?.name).join(", ")} was added. They resubmit a roleplay when ready.`}</Text>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push(`/${viewer}/verify`)}>Back to queue</Button>
          {next && <Button onClick={() => router.push(`/${viewer}/verify/${next.id}`)}>Next in queue</Button>}
        </div>
      </div>
    );

  const bars = Array.from({ length: 64 }, (_, i) => 18 + Math.round(Math.abs(Math.sin(i * 1.7) * 26 + Math.cos(i * 0.6) * 14)));

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/${viewer}/verify`} className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Queue</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar initials={u.initials} size={52} tone="ink" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Text as="h1" size="display-lg" weight="extrabold">{u.name}</Text>
          <Text size="body-lg" tone="subtle">{course.title} · v{p.version} · passed {fmtDate(att.at)} · attempt {p.attempts.indexOf(att) + 1}{viewer === "trainer" ? " · verifying as delegate" : ""}</Text>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title="Assessment call" eyebrow={`Recorded · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`}>
            <div className="squircle flex flex-col gap-3 rounded-panel bg-ink p-4 text-white">
              <div className="flex items-center gap-3">
                <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => { if (pos >= duration) setPos(0); setPlaying(!playing); }} className="grid size-11 place-items-center rounded-full bg-brand">
                  {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
                </button>
                <div className="flex h-12 flex-1 items-center gap-[3px]" aria-hidden="true">
                  {bars.map((h, i) => <span key={i} className={cn("w-full rounded-full", i / bars.length <= pos / duration ? "bg-brand-2" : "bg-white/20")} style={{ height: `${h}%` }} />)}
                </div>
                <Text size="body" tone="inverse" tabular className="w-12 text-right opacity-80">{Math.floor(pos / 60)}:{String(Math.floor(pos % 60)).padStart(2, "0")}</Text>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Text size="body" tone="inverse" className="min-w-0 flex-1 truncate opacity-80">{curTurn ? `${curTurn.speaker === "rep" ? u.first : "HCP"}: ${curTurn.text}` : "Press play"}</Text>
                <div className="flex gap-1">{[1, 1.5, 2].map((x) => <button key={x} type="button" onClick={() => setSpeed(x)} className={cn("rounded-chip px-2 py-0.5 text-caption font-bold", speed === x ? "bg-white text-ink" : "bg-white/10 text-white")}>{x}×</button>)}</div>
              </div>
            </div>
            <Scorecard result={call} mode="verify" onSeek={(sec) => { setPos(sec); setPlaying(true); }} />
          </Card>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-[84px] xl:self-start">
          <Card title="Scores" padded>
            <div className="flex gap-6">
              <div className="flex flex-col"><Text size="caption" tone="subtle">Overall</Text><Text size="hero" weight="extrabold" tabular>{att.overall}%</Text></div>
              <div className="flex flex-col"><Text size="caption" tone="subtle">Quiz</Text><Text size="display" weight="bold" tabular>{att.quiz}%</Text></div>
              <div className="flex flex-col"><Text size="caption" tone="subtle">Call</Text><Text size="display" weight="bold" tabular>{call.score}%</Text></div>
            </div>
            <div className="flex flex-col gap-1.5">
              {COMPETENCIES.filter((c) => att.competencyScores[c.id] !== undefined).slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-body"><span className="truncate">{c.name}</span><span className="flex items-center gap-2"><strong className="tabular-nums">{att.competencyScores[c.id]}</strong><BandChip score={att.competencyScores[c.id]} size="xs" /></span></div>
              ))}
            </div>
          </Card>
          <Card title="Your decision" padded>
            <Segmented aria-label="Decision">
              <SegmentedButton active={decision === "approve"} onClick={() => setDecision("approve")}>Approve</SegmentedButton>
              <SegmentedButton active={decision === "coach"} onClick={() => setDecision("coach")}>Needs coaching</SegmentedButton>
            </Segmented>
            {decision === "coach" && (
              <div className="flex flex-col gap-2">
                <Text size="label" weight="semibold" tone="muted">Focus areas (required)</Text>
                <div className="flex flex-wrap gap-1.5">{comps.map((c) => <Chip key={c} size="md" selected={focus.includes(c)} onClick={() => setFocus(focus.includes(c) ? focus.filter((x) => x !== c) : [...focus, c])}>{competency(c)?.name}</Chip>)}</div>
              </div>
            )}
            <Field label={decision === "coach" ? "Coaching note (required)" : "Note (optional)"} multiline rows={3} value={note}
              placeholder={decision === "coach" ? "e.g. Lead with fair balance when you share the EASI data." : "e.g. Strong access answer."}
              onChange={(e) => setNote((e.target as unknown as HTMLTextAreaElement).value)} />
            <Button size="lg" fullWidth disabled={decision === "coach" && (!note.trim() || !focus.length)}
              onClick={() => { s.decideVerify(p.id, { approve: decision === "approve", note: note.trim(), focus, by: me, delegate: viewer === "trainer" }); setDone(decision); }}>
              {decision === "approve" ? `Approve · certify ${u.first}` : "Send back with coaching"}
            </Button>
            <Text size="caption" tone="subtle">Your decision and note are part of {u.first}'s training record.</Text>
          </Card>
        </aside>
      </div>
    </div>
  );
}
