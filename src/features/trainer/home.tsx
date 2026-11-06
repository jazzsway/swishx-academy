"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Plus, ArrowRight, FileDown } from "lucide-react";
import { useApp, live, current } from "@/store/app-store";
import {
  counts, heatmap, lift, minutesSaved, pct, projected, scopedProgress, timeToCertified, trend, firstTry,
  weakestDomains, daysFromToday, fmtDate, isOverdue, type Scope,
} from "@/store/selectors";
import { DIVISIONS, DOMAINS, REGIONS, TODAY } from "@/data/org";
import { PRACTICE_AGGREGATE } from "@/data/seed";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card, Dot, Meter, Sparkline, bandCellClass } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";

export function TrainerHome() {
  const router = useRouter();
  const s = useApp();
  const { message, open, showToast } = useToast();
  const [divisionId, setDivisionId] = useState<string>("div-imm");
  const [hmSource, setHmSource] = useState<"assessment" | "screening">("assessment");
  const scope: Scope = { divisionId };

  const campaign = s.campaigns.find((c) => c.id === "cmp-lumora")!;
  const lumora = s.courses.find((c) => c.id === "c-lumora-launch")!;
  const ps = useMemo(() => scopedProgress(s, scope, "c-lumora-launch"), [s, divisionId]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = counts(ps);
  const ready = pct(c.certified, c.total);
  const proj = projected(ps, campaign.dueAt);
  const lf = lift(ps);
  const saved = Math.round(minutesSaved(ps, lumora) / 60);
  const rows = heatmap(s, ps, hmSource);
  const weakest = weakestDomains(rows)[0];

  const byRegion = REGIONS.filter((r) => r.divisionId === divisionId).map((r) => {
    const rp = scopedProgress(s, { regionId: r.id }, "c-lumora-launch");
    return { ...r, value: pct(counts(rp).certified, rp.length) };
  }).sort((a, b) => a.value - b.value);

  /* TH-4: one queue of things waiting on the trainer. */
  const actions = useMemo(() => {
    const out: { tone: "danger" | "warn" | "faint"; title: string; sub: string; cta: string; href?: string; onClick?: () => void }[] = [];
    for (const course of s.courses) {
      const v = current(course);
      if (v.state === "changes") out.push({ tone: "danger", title: `MLR changes requested · ${course.title} v${v.version}`, sub: `${v.comments.filter((m) => !m.resolved).length} open comments`, cta: "Fix", href: `/trainer/courses/${course.id}/review` });
      if (v.state === "approved") out.push({ tone: "warn", title: `Approved, ready to publish · ${course.title} v${v.version}`, sub: `Doc ${v.docNumber}`, cta: "Publish", href: `/trainer/courses/${course.id}/review` });
      if (v.state === "in_review" && v.submittedAt) out.push({ tone: "faint", title: `In MLR review for ${-daysFromToday(v.submittedAt)} days · ${course.title}`, sub: v.vaultId ? `Vault ${v.vaultId}` : "Submitted", cta: "Update", href: `/trainer/courses/${course.id}/review` });
      const lv = live(course);
      if (lv?.expiresAt && daysFromToday(lv.expiresAt) <= 30) out.push({ tone: "warn", title: `Approval expires in ${daysFromToday(lv.expiresAt)} days · ${course.title} v${lv.version}`, sub: `Doc ${lv.docNumber} · ${s.progress.filter((p) => p.courseId === course.id && p.state === "certified").length} reps certified on it`, cta: "Review", href: `/trainer/courses/${course.id}/review` });
    }
    const slow = s.progress.filter((p) => p.state === "awaiting_verify" && p.verify && -daysFromToday(p.verify.requestedAt) > 5);
    if (slow.length) out.push({ tone: "warn", title: `${slow.length} verifications waiting over 5 days`, sub: "Managers haven't acted. You can verify on their behalf.", cta: "Verify", href: "/trainer/verify" });
    const overdue = ps.filter(isOverdue);
    if (overdue.length) out.push({ tone: "warn", title: `${overdue.length} reps overdue · Lumora launch readiness`, sub: `${overdue.filter((p) => p.state === "not_started" || p.state === "screening").length} haven't finished screening`, cta: "Nudge all",
      onClick: () => { let n = 0; for (const p of overdue) if (s.nudge(p.id, "u-maya")) n++; showToast(n ? `Nudged ${n} reps` : "Already nudged in the last 48 hours"); } });
    const maxed = s.progress.filter((p) => p.attempts.filter((a) => !a.passed).length >= 3);
    if (maxed.length) out.push({ tone: "danger", title: `${maxed.length} reps used every attempt`, sub: "Escalated to their managers", cta: "View", href: "/trainer/records" });
    return out;
  }, [s, ps, showToast]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">Good morning, Maya</Text>
          <Text as="p" size="subhead" tone="muted">
            Lumora launches in {daysFromToday(campaign.dueAt)} days. {c.overdue} reps are overdue and {actions.length} things need you.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented aria-label="Division">
            {DIVISIONS.map((d) => <SegmentedButton key={d.id} active={divisionId === d.id} onClick={() => setDivisionId(d.id)}>{d.name}</SegmentedButton>)}
          </Segmented>
          <Button size="lg" onClick={() => router.push("/trainer/courses/new")}><Plus className="size-4" aria-hidden="true" />Create course</Button>
        </div>
      </div>

      {divisionId === "div-cm" ? <CardioPanel /> : (
      <>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" eyebrow="Campaign · Launch readiness" title={campaign.name}
          actions={<Link href={`/trainer/campaigns/${campaign.id}`} className="text-body-lg font-semibold text-brand-deep hover:underline">Open campaign</Link>}>
          <Text size="body" tone="subtle" className="-mt-3">{c.total} reps · due {fmtDate(campaign.dueAt)} · target {campaign.target}%</Text>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div className="flex flex-col gap-1">
              <Text size="hero-lg" weight="extrabold" tracking="tight" className="text-[56px] leading-none" tabular>{ready}%</Text>
              <Text size="body-lg" tone="muted">certified · {c.certified} of {c.total}</Text>
            </div>
            <div className="flex flex-col gap-1 pb-1">
              <Text size="display" weight="bold" tone={proj >= campaign.target ? "ok" : "warn"} tabular>{proj}%</Text>
              <Text size="body" tone="muted">projected by {fmtDate(campaign.dueAt)} (estimate)</Text>
            </div>
            <div className="ml-auto"><Sparkline values={trend(ps)} label={`Certified percentage over 8 weeks, now ${ready}%`} /></div>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Certified ${c.certified}, in progress ${c.in_progress}, not started ${c.not_started}, overdue ${c.overdue}`}>
              <div className="bg-ok" style={{ flex: c.certified }} />
              <div className="bg-brand-2" style={{ flex: c.in_progress }} />
              <div className="bg-[#d8d4ce]" style={{ flex: c.not_started }} />
              <div className="bg-danger" style={{ flex: c.overdue }} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-body text-ink-2">
              <Link href="/trainer/records?bucket=certified" className="flex items-center gap-1.5 hover:underline"><Dot tone="ok" />Certified {c.certified}</Link>
              <Link href="/trainer/records?bucket=in_progress" className="flex items-center gap-1.5 hover:underline"><Dot tone="brand-2" />In progress {c.in_progress}</Link>
              <Link href="/trainer/records?bucket=not_started" className="flex items-center gap-1.5 hover:underline"><span className="size-2 rounded-full bg-[#d8d4ce]" />Not started {c.not_started}</Link>
              <Link href="/trainer/records?bucket=overdue" className="flex items-center gap-1.5 hover:underline"><Dot tone="danger" />Overdue {c.overdue}</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {byRegion.map((r, i) => (
              <Link key={r.id} href={`/trainer/campaigns/${campaign.id}?region=${r.id}`}
                className={`squircle flex flex-col gap-0.5 rounded-panel px-4 py-3 transition-transform hover:-translate-y-0.5 ${i === 0 ? "bg-danger-bg text-danger-deep" : i === 1 ? "bg-warn-bg text-warn" : "bg-subtle text-ink"}`}>
                <span className="text-caption">{r.name}</span>
                <span className="text-display font-extrabold tabular-nums">{r.value}%</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card tone="ink" eyebrow="Proof of progress" title="Screening to final assessment">
          <div className="flex items-baseline gap-3">
            <Text size="display" tone="inverse" className="opacity-60" tabular>{lf.before}</Text>
            <ArrowRight className="size-5 text-white/40" aria-hidden="true" />
            <Text size="hero-lg" tone="inverse" weight="extrabold" tracking="tight" tabular>{lf.after}</Text>
            <Text size="title" weight="bold" className="text-ok-on-dark">+{lf.lift} pts</Text>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 text-body-lg">
            {[
              ["Reps who improved", `${lf.improved}%`],
              ["Median days to certified", `${timeToCertified(ps)}`],
              ["Time saved by personalisation", `${saved} h`],
              ["First-try pass rate", `${firstTry(ps)}%`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><span className="text-white/65">{k}</span><span className="font-bold tabular-nums">{v}</span></div>
            ))}
          </div>
          <Button variant="ghost" className="mt-auto border-white/20 text-white hover:bg-white/10 hover:text-white" fullWidth
            onClick={() => exportProof({ ready, proj, lf, saved, c, ttc: timeToCertified(ps) })}>
            <FileDown className="size-4" aria-hidden="true" />Export proof pack
          </Button>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Needs your action" actions={<Chip tone="brand" size="md">{actions.length}</Chip>}>
          {actions.length === 0 ? <Text tone="subtle">Nothing waiting on you. Nice.</Text> : (
            <ul className="flex flex-col">
              {actions.map((a, i) => (
                <li key={i} className="flex items-center gap-3.5 border-b border-hair py-3 last:border-0">
                  <Dot tone={a.tone} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Text size="body-lg" weight="semibold">{a.title}</Text>
                    <Text size="caption" tone="subtle">{a.sub}</Text>
                  </div>
                  <Button size="sm" variant={i === 0 ? "primary" : "secondary"} onClick={() => (a.href ? router.push(a.href) : a.onClick?.())}>{a.cta}</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Competency gaps" actions={
          <Segmented aria-label="Score source">
            <SegmentedButton active={hmSource === "assessment"} onClick={() => setHmSource("assessment")}>Latest assessment</SegmentedButton>
            <SegmentedButton active={hmSource === "screening"} onClick={() => setHmSource("screening")}>Screening</SegmentedButton>
          </Segmented>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-1 text-body">
              <thead>
                <tr className="text-left text-caption text-ink-3">
                  <th scope="col" className="px-1 font-semibold" />
                  {DOMAINS.filter((d) => d.id !== "compliance").map((d) => <th key={d.id} scope="col" className="px-1 font-semibold">{d.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" className="px-1 text-left font-semibold">{r.name}</th>
                    {r.cells.map((cell) => (
                      <td key={cell.domain} className={`rounded-chip px-2.5 py-2.5 text-center font-bold tabular-nums ${bandCellClass(cell.value)}`}>{cell.value ?? "–"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {weakest && (
            <Text as="p" size="body-lg" tone="muted">
              {weakest.domain.name} is the weakest area at {weakest.value}. <Link className="font-semibold text-brand-deep hover:underline" href="/trainer/courses/c-lumora-launch?module=lm11">See the blocks that teach it</Link>
            </Text>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Practice pulse" actions={<span className="flex items-center gap-1.5 text-caption text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Anonymous · groups of 5+</span>}>
          <div className="flex flex-wrap gap-8">
            <div className="flex flex-col"><Text size="hero" weight="extrabold" tabular>{PRACTICE_AGGREGATE.sessionsThisWeek}</Text><Text size="caption" tone="subtle">sessions this week</Text></div>
            <div className="flex flex-col"><Text size="hero" weight="extrabold" tabular>{PRACTICE_AGGREGATE.practisingReps}</Text><Text size="caption" tone="subtle">reps practising</Text></div>
            <div className="ml-auto self-end"><Sparkline values={PRACTICE_AGGREGATE.weekly.map((v) => Math.round(v / 5))} width={160} height={48} color="var(--color-brand-2)" label="Practice sessions trending up over 8 weeks" /></div>
          </div>
          <Text size="caption" weight="semibold" tone="subtle">Most missed in practice calls</Text>
          <div className="flex flex-col gap-3">
            {PRACTICE_AGGREGATE.missed.slice(0, 3).map((m) => (
              <div key={m.criterion} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-body"><span>{m.criterion}</span><strong className="tabular-nums">{m.hit}%</strong></div>
                <Meter value={m.hit} tone={m.hit < 50 ? "brand" : "brand-2"} label={m.criterion} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Content health" actions={<Text size="caption" tone="subtle">Lumora launch · last 50 attempts</Text>}>
          {[
            { v: "31%", tone: "danger" as const, t: "Q · Dosing in hepatic impairment", s: "Answered correctly by 31%. The wording may be unclear.", href: "/trainer/courses/c-lumora-launch/questions" },
            { v: "98%", tone: "default" as const, t: "Q · Lumora is a…", s: "Too easy to tell reps apart.", href: "/trainer/courses/c-lumora-launch/questions" },
            { v: "82%", tone: "default" as const, t: "Module 5 · Itch and patient-reported outcomes", s: "Skipped by reps who tested out.", href: "/trainer/courses/c-lumora-launch?module=lm5" },
          ].map((x) => (
            <Link key={x.t} href={x.href} className="squircle flex items-start gap-4 rounded-panel bg-subtle px-4 py-3 transition-colors hover:bg-tint">
              <Text size="subhead" weight="extrabold" tone={x.tone === "danger" ? "danger" : "muted"} className="w-12 shrink-0" tabular>{x.v}</Text>
              <div className="flex flex-col gap-0.5"><Text size="body-lg" weight="semibold">{x.t}</Text><Text size="caption" tone="subtle">{x.s}</Text></div>
            </Link>
          ))}
        </Card>
      </div>
      </>
      )}
      <Toast message={message} open={open} />
    </div>
  );

  function exportProof(d: { ready: number; proj: number; lf: ReturnType<typeof lift>; saved: number; c: ReturnType<typeof counts>; ttc: number }) {
    const csv = [
      "Metric,Value",
      `Campaign,Lumora launch readiness`,
      `Generated,${TODAY.toDateString()}`,
      `Certified,${d.c.certified} of ${d.c.total} (${d.ready}%)`,
      `Projected by due date,${d.proj}%`,
      `Average screening score,${d.lf.before}`,
      `Average final score,${d.lf.after}`,
      `Lift (points),${d.lf.lift}`,
      `Reps improved,${d.lf.improved}%`,
      `Median days to certified,${d.ttc}`,
      `Hours saved by personalisation,${d.saved}`,
      `Weakest domain,${weakest?.domain.name ?? "-"}`,
      "Note,Prototype with fictional data",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "lumora-proof-pack.csv";
    a.click();
    showToast("Proof pack downloaded");
  }
}

function CardioPanel() {
  const s = useApp();
  const cardexa = s.courses.find((c) => c.id === "c-cardexa")!;
  const ps = scopedProgress(s, { divisionId: "div-cm" }, "c-cardexa");
  const c = counts(ps);
  const lv = live(cardexa);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card eyebrow="Course" title="Cardexa label update 2026">
        <div className="flex items-end gap-8">
          <div className="flex flex-col gap-1"><Text size="hero-lg" weight="extrabold" tabular>{pct(c.certified, c.total)}%</Text><Text tone="muted" size="body-lg">certified on v{lv?.version} · {c.certified} of {c.total}</Text></div>
        </div>
        {lv?.expiresAt && (
          <div className="squircle flex flex-col gap-1 rounded-panel bg-warn-bg px-4 py-3">
            <Text weight="bold" tone="warn" size="body-lg">v{lv.version} approval expires in {daysFromToday(lv.expiresAt)} days</Text>
            <Text size="body" tone="muted">v{current(cardexa).version} is back from MLR with comments. Fix and resubmit to avoid a gap.</Text>
          </div>
        )}
        <Link href="/trainer/courses/c-cardexa/review" className="text-body-lg font-semibold text-brand-deep hover:underline">Open review &amp; versions</Link>
      </Card>
      <Card title="Readiness by district">
        {s.districts.filter((d) => ["d-carolinas", "d-chesapeake", "d-bay", "d-desert"].includes(d.id)).map((d) => {
          const dp = scopedProgress(s, { districtId: d.id }, "c-cardexa");
          const v = pct(counts(dp).certified, dp.length);
          return (
            <div key={d.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-body-lg"><span>{d.name}</span><strong>{v}%</strong></div>
              <Meter value={v} tone="ok" label={d.name} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}
