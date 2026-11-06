"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, CircleAlert, CircleCheck, FileDown, ExternalLink, Upload, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live } from "@/store/app-store";
import { daysFromToday, fmtDate } from "@/store/selectors";
import { TODAY } from "@/data/org";
import type { CourseVersion, Module } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card, VersionChip, KeyValue } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { useCourse } from "./use-course";
import { runChecks, type Finding } from "./checks";

const STEPS = [
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Checks & package" },
  { id: "in_review", label: "In MLR review" },
  { id: "approved", label: "Approved" },
  { id: "published", label: "Published" },
];
const STEP_INDEX: Record<string, number> = { draft: 0, changes: 0, ready: 1, in_review: 2, approved: 3, published: 4, superseded: 4, expired: 4, withdrawn: 4 };
const today = TODAY.toISOString().slice(0, 10);
const plusYear = new Date(TODAY.getTime() + 365 * 86400000).toISOString().slice(0, 10);

export function ReviewAndVersions() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id);
  const app = useApp();
  const { message, open, showToast } = useToast();
  const [ack, setAck] = useState<string[]>([]);
  const [vault, setVault] = useState("");
  const [submitted, setSubmitted] = useState(today);
  const [decision, setDecision] = useState<"approved" | "changes">("approved");
  const [doc, setDoc] = useState("");
  const [approvedAt, setApprovedAt] = useState(today);
  const [expiresAt, setExpiresAt] = useState(plusYear);
  const [pdf, setPdf] = useState("");
  const [confirmVersion, setConfirmVersion] = useState(false);
  const [comments, setComments] = useState("");
  const [transition, setTransition] = useState<"minor" | "recertify" | "restart">("recertify");
  const [published, setPublished] = useState<null | { recert: boolean }>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("Label change");
  const [compare, setCompare] = useState<[number, number] | null>(null);

  const findings = useMemo(() => (data ? runChecks(data.course) : []), [data]);
  if (!data) return null;
  const { course, cur } = data;
  const lv = live(course);
  const reds = findings.filter((f) => f.severity === "red");
  const oranges = findings.filter((f) => f.severity === "orange");
  const openComments = cur.comments.filter((c) => !c.resolved);
  const stepIdx = STEP_INDEX[cur.state];
  const base = `/trainer/courses/${course.id}`;

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-wrap items-center gap-2" aria-label="Lifecycle">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className={cn("flex items-center gap-2 rounded-chip border px-3 py-1.5 text-body font-semibold",
              i < stepIdx ? "border-ok-line bg-ok-bg text-ok" : i === stepIdx ? (cur.state === "changes" ? "border-danger-line bg-danger-bg text-danger" : "border-brand bg-tint text-brand-deep") : "border-hair text-ink-3")}>
              {i < stepIdx ? <Check className="size-3.5" aria-hidden="true" /> : <span className="text-micro">{i + 1}</span>}
              {i === 0 && cur.state === "changes" ? "Changes requested" : s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-hair-2" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          {cur.state === "changes" && (
            <Card title={`MLR comments · ${openComments.length} open`} eyebrow={`Returned ${fmtDate(cur.history.findLast((h) => h.action === "Changes requested")?.at)}`}
              actions={<Button variant="secondary" onClick={() => router.push(base)}><Wand2 className="size-4" aria-hidden="true" />Fix in editor</Button>}>
              <ul className="flex flex-col gap-2">
                {cur.comments.map((c) => (
                  <li key={c.id} className={cn("squircle flex items-start gap-3 rounded-panel border p-3.5", c.resolved ? "border-ok-line bg-ok-bg" : "border-hair bg-card")}>
                    <button type="button" role="checkbox" aria-checked={c.resolved} aria-label="Resolved" onClick={() => app.resolveComment(course.id, c.id, !c.resolved)}
                      className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-glyph border", c.resolved ? "border-ok bg-ok text-white" : "border-hair-3")}>
                      {c.resolved && <Check className="size-3.5" aria-hidden="true" />}
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Text size="body-lg" tone={c.resolved ? "subtle" : "default"} className={c.resolved ? "line-through" : undefined}>{c.text}</Text>
                      {c.moduleId && <Link href={`${base}?module=${c.moduleId}`} className="self-start text-caption font-semibold text-brand-deep hover:underline">Open module</Link>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(cur.state === "draft" || cur.state === "changes") && (
            <Card title="Pre-review checks" eyebrow="Must be green before MLR"
              actions={<Chip tone={reds.length ? "danger" : oranges.length ? "warn" : "ok"} size="md">{reds.length ? `${reds.length} blocking` : oranges.length ? `${oranges.length} to acknowledge` : "All clear"}</Chip>}>
              <FindingList findings={findings} ack={ack} setAck={setAck} base={base} />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-4">
                <Text size="body" tone="subtle">
                  {reds.length ? "Fix the red items first. Ask SwishX in the editor: “Fix all citation and wording issues”." :
                    openComments.length ? `Resolve ${openComments.length} MLR comment(s) first.` :
                      oranges.some((o) => !ack.includes(o.id)) ? "Acknowledge each orange item. Your note goes into the package." : "Ready to generate the MLR package."}
                </Text>
                <Button disabled={reds.length > 0 || openComments.length > 0 || oranges.some((o) => !ack.includes(o.id))}
                  onClick={() => { app.markReady(course.id, ack); showToast("Package generated"); }}>Generate MLR package</Button>
              </div>
            </Card>
          )}

          {cur.state === "ready" && (
            <Card title="Submit in PromoMats" eyebrow="Package ready">
              <div className="squircle flex flex-wrap items-center gap-4 rounded-panel border border-hair bg-subtle p-4">
                <div className="grid size-12 place-items-center rounded-control bg-card text-brand-deep shadow-hair"><FileDown className="size-5" aria-hidden="true" /></div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Text size="body-lg" weight="bold">{course.title} · v{cur.version} · MLR package</Text>
                  <Text size="caption" tone="subtle">Version ID {cur.versionId} · {course.modules.length} modules · {course.items.length} questions · generated {fmtDate(cur.packageAt)}</Text>
                </div>
                <Link href={`${base}/package`} className="inline-flex h-10 items-center gap-2 rounded-control border border-hair-2 bg-card px-4 text-body-lg font-semibold hover:bg-subtle"><ExternalLink className="size-4" aria-hidden="true" />Open package</Link>
              </div>
              <Text size="body" tone="muted">Upload the package to Veeva Vault PromoMats as an internal training document and start your MLR workflow there. Then record it here.</Text>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Submitted on" type="date" value={submitted} onChange={(e) => setSubmitted(e.target.value)} />
                <Field label="Vault document ID (optional)" placeholder="VV-000000" value={vault} onChange={(e) => setVault(e.target.value)} />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => app.backToDraft(course.id)}>Back to draft</Button>
                <Button onClick={() => { app.markSubmitted(course.id, { date: submitted, vaultId: vault || undefined }); showToast("Marked as in MLR review"); }}>Mark as submitted</Button>
              </div>
            </Card>
          )}

          {cur.state === "in_review" && (
            <Card title="Record the MLR decision" eyebrow={`Submitted ${fmtDate(cur.submittedAt)}${cur.vaultId ? ` · ${cur.vaultId}` : ""} · ${-daysFromToday(cur.submittedAt!)} days in review`}>
              <Segmented aria-label="Decision">
                <SegmentedButton active={decision === "approved"} onClick={() => setDecision("approved")}>Approved</SegmentedButton>
                <SegmentedButton active={decision === "changes"} onClick={() => setDecision("changes")}>Changes requested</SegmentedButton>
              </Segmented>
              {decision === "approved" ? (
                <div className="flex flex-col gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Document number" placeholder="e.g. LUM-US-0240" value={doc} onChange={(e) => setDoc(e.target.value)} />
                    <Field label="Approval date" type="date" value={approvedAt} onChange={(e) => setApprovedAt(e.target.value)} />
                    <Field label="Expiry date" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                  </div>
                  <label className="squircle flex cursor-pointer items-center gap-3 rounded-panel border border-dashed border-hair-3 px-4 py-3 hover:bg-subtle">
                    <Upload className="size-4 text-ink-3" aria-hidden="true" />
                    <Text size="body-lg" weight="semibold" tone={pdf ? "ok" : "muted"}>{pdf || "Upload the approved PDF from PromoMats"}</Text>
                    <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setPdf(e.target.files?.[0]?.name ?? "")} />
                  </label>
                  <label className="flex items-start gap-2.5">
                    <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand)]" checked={confirmVersion} onChange={(e) => setConfirmVersion(e.target.checked)} />
                    <Text size="body-lg">This approval is for version ID <span className="font-mono font-semibold">{cur.versionId}</span>, printed on every page of the package.</Text>
                  </label>
                  <div className="flex justify-end">
                    <Button disabled={!doc.trim() || !expiresAt || !pdf || !confirmVersion}
                      onClick={() => { app.recordApproval(course.id, { docNumber: doc.trim(), approvedAt, expiresAt }); showToast(`Approved · ${doc.trim()}`); }}>Record approval</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Field label="MLR comments · one per line" multiline rows={5} value={comments} placeholder={"Module 2: remove “usually approved within a few days”.\nAdd the PI page for the eGFR statement."}
                    onChange={(e) => setComments((e.target as unknown as HTMLTextAreaElement).value)} />
                  <div className="flex justify-end">
                    <Button disabled={!comments.trim()} onClick={() => { app.recordChanges(course.id, comments.split("\n").map((x) => x.trim()).filter(Boolean)); showToast("Comments recorded"); }}>Record changes requested</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {cur.state === "approved" && (
            <Card title={`Publish v${cur.version}`} eyebrow={`Approved · ${cur.docNumber}`}>
              <KeyValue items={[{ k: "Document number", v: cur.docNumber }, { k: "Approved", v: fmtDate(cur.approvedAt, true) }, { k: "Expires", v: fmtDate(cur.expiresAt, true) }]} />
              {lv && (
                <div className="flex flex-col gap-2">
                  <Text size="body-lg" weight="semibold">What happens to reps on v{lv.version}?</Text>
                  {([
                    ["recertify", "Recertify", "Everyone recertifies on the new version by a due date. Default for label and safety changes."],
                    ["minor", "Minor update", "Progress carries over for unchanged blocks. Certifications stay valid."],
                    ["restart", "Restart", "Progress resets. Use for a major restructure."],
                  ] as const).map(([k, t, d]) => (
                    <label key={k} className={cn("squircle flex cursor-pointer items-start gap-3 rounded-panel border p-3.5", transition === k ? "border-brand bg-tint" : "border-hair hover:bg-subtle")}>
                      <input type="radio" name="transition" className="mt-1 accent-[var(--color-brand)]" checked={transition === k} onChange={() => setTransition(k)} />
                      <span className="flex flex-col"><span className="text-body-lg font-semibold">{t}</span><span className="text-caption text-ink-3">{d}</span></span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button size="lg" onClick={() => { app.publish(course.id, lv ? transition : "minor"); setPublished({ recert: !!lv && transition === "recertify" }); }}>Publish v{cur.version}</Button>
              </div>
            </Card>
          )}

          {cur.state === "published" && (
            <Card title={`v${cur.version} is live`} eyebrow={cur.docNumber}
              actions={<Button variant="danger" size="sm" onClick={() => setWithdrawOpen(true)}>Withdraw</Button>}>
              <KeyValue items={[
                { k: "Document number", v: cur.docNumber },
                { k: "Approved", v: fmtDate(cur.approvedAt, true) },
                { k: "Expires", v: <span className={cur.expiresAt && daysFromToday(cur.expiresAt) <= 30 ? "text-warn" : undefined}>{fmtDate(cur.expiresAt, true)} · in {cur.expiresAt ? daysFromToday(cur.expiresAt) : "–"} days</span> },
                { k: "Published", v: fmtDate(cur.publishedAt, true) },
                { k: "Reps certified on it", v: app.progress.filter((p) => p.courseId === course.id && p.version === cur.version && p.state === "certified").length },
              ]} />
              <Text size="body" tone="subtle">Expired or withdrawn content leaves reps' paths automatically. Certifications keep their history.</Text>
            </Card>
          )}

          {lv && cur.version !== lv.version && (
            <Card tone="subtle" title={`v${lv.version} stays live meanwhile`} eyebrow={lv.docNumber}>
              <Text size="body-lg" tone={lv.expiresAt && daysFromToday(lv.expiresAt) <= 30 ? "warn" : "muted"} weight="semibold">
                Expires {fmtDate(lv.expiresAt, true)}{lv.expiresAt ? ` · in ${daysFromToday(lv.expiresAt)} days` : ""}
              </Text>
              <Text size="body" tone="muted">If v{cur.version} isn't approved and published by then, v{lv.version} leaves reps' paths and its {app.progress.filter((p) => p.courseId === course.id && p.state === "certified").length} certifications are flagged “version expired”.</Text>
            </Card>
          )}

          <Card title="Version history">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-body">
                <thead><tr className="text-left text-caption text-ink-3"><th className="py-2 font-semibold">Version</th><th className="font-semibold">State</th><th className="font-semibold">Doc number</th><th className="font-semibold">Approved</th><th className="font-semibold">Expires</th><th className="font-semibold">Certified</th><th /></tr></thead>
                <tbody>
                  {[...course.versions].reverse().map((v) => (
                    <tr key={v.version} className="border-t border-hair">
                      <td className="py-2.5 font-semibold">v{v.version}<div className="font-mono text-micro text-ink-4">{v.versionId}</div></td>
                      <td><VersionChip state={v.state} /></td>
                      <td className="font-mono">{v.docNumber ?? "—"}</td>
                      <td>{fmtDate(v.approvedAt, true)}</td>
                      <td>{fmtDate(v.expiresAt, true)}</td>
                      <td className="tabular-nums">{app.progress.filter((p) => p.courseId === course.id && p.version === v.version && p.state === "certified").length || "—"}</td>
                      <td className="text-right">{course.versions.length > 1 && v.version !== course.versions[0].version && (
                        <button type="button" className="text-body font-semibold text-brand-deep hover:underline" onClick={() => setCompare([v.version - 1, v.version])}>Compare with v{v.version - 1}</button>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-[84px] xl:self-start">
          <Card title={`v${cur.version} history`} padded>
            <ol className="flex flex-col gap-3">
              {[...cur.history].reverse().map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  <div className="flex flex-col"><Text size="body" weight="semibold">{h.action}</Text><Text size="caption" tone="subtle">{fmtDate(h.at, true)} · {h.by}{h.note ? ` · ${h.note}` : ""}</Text></div>
                </li>
              ))}
            </ol>
          </Card>
          <Text size="caption" tone="subtle" className="px-1">v1 of the Veeva integration is manual: you submit in PromoMats and record the outcome here. The API sync is on the roadmap (PRD ML-6).</Text>
        </aside>
      </div>

      <Modal open={!!published} onClose={() => { setPublished(null); router.push(`${base}/assign`); }} title={`v${cur.version} is published`} size="sm"
        footer={published?.recert ? (
          <>
            <Button variant="secondary" onClick={() => { setPublished(null); router.push(`${base}/assign`); }}>Assign manually</Button>
            <Button onClick={() => { setPublished(null); router.push(`/trainer/campaigns/new?type=label_update&course=${course.id}`); }}>Create recertification campaign</Button>
          </>
        ) : <Button onClick={() => { setPublished(null); router.push(`${base}/assign`); }}>Assign it</Button>}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="success-pop grid size-14 place-items-center rounded-full bg-ok-bg text-ok"><CircleCheck className="size-7" aria-hidden="true" /></div>
          <Text size="body-lg" tone="muted">{published?.recert ? "Everyone certified on the old version must recertify. Set a due date and track it as a campaign." : "Reps assigned to this course now see the new version."}</Text>
        </div>
      </Modal>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title={`Withdraw v${cur.version}?`} description="It leaves every rep's path immediately. Certifications keep their history." size="sm"
        footer={<><Button variant="secondary" onClick={() => setWithdrawOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => { app.withdraw(course.id, withdrawReason); setWithdrawOpen(false); showToast("Withdrawn"); }}>Withdraw</Button></>}>
        <div className="flex flex-wrap gap-2">{["Label change", "Error", "Other"].map((r) => <Chip key={r} size="lg" selected={withdrawReason === r} onClick={() => setWithdrawReason(r)}>{r}</Chip>)}</div>
      </Modal>

      {compare && <CompareModal versions={course.versions} pair={compare} onClose={() => setCompare(null)} />}
      <Toast message={message} open={open} />
    </div>
  );
}

function FindingList({ findings, ack, setAck, base }: { findings: Finding[]; ack: string[]; setAck: (a: string[]) => void; base: string }) {
  const order = { red: 0, orange: 1, green: 2 } as const;
  return (
    <ul className="flex flex-col gap-2">
      {[...findings].sort((a, b) => order[a.severity] - order[b.severity]).map((f) => (
        <li key={f.id} className={cn("squircle flex items-start gap-3 rounded-panel border p-3.5",
          f.severity === "red" ? "border-danger-line bg-danger-bg" : f.severity === "orange" ? "border-warn-line bg-warn-bg" : "border-hair bg-card")}>
          {f.severity === "green" ? <CircleCheck className="mt-0.5 size-4.5 shrink-0 text-ok" aria-hidden="true" /> : <CircleAlert className={cn("mt-0.5 size-4.5 shrink-0", f.severity === "red" ? "text-danger" : "text-warn")} aria-hidden="true" />}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Text size="body-lg" weight="semibold">{f.title}</Text>
            <Text size="body" tone="muted">{f.detail}</Text>
          </div>
          {f.severity !== "green" && f.moduleId && <Link href={`${base}?module=${f.moduleId}`} className="shrink-0 text-body font-semibold text-brand-deep hover:underline">Fix with AI</Link>}
          {f.severity === "orange" && (
            <label className="flex shrink-0 items-center gap-1.5 text-body font-semibold text-warn">
              <input type="checkbox" className="size-4 accent-[var(--color-warn)]" checked={ack.includes(f.id)} onChange={(e) => setAck(e.target.checked ? [...ack, f.id] : ack.filter((x) => x !== f.id))} />Acknowledge
            </label>
          )}
        </li>
      ))}
    </ul>
  );
}

function CompareModal({ versions, pair, onClose }: { versions: CourseVersion[]; pair: [number, number]; onClose: () => void }) {
  const a = versions.find((v) => v.version === pair[0])!;
  const b = versions.find((v) => v.version === pair[1])!;
  const text = (ms: Module[]) => new Map(ms.flatMap((m) => m.blocks.flatMap((bl) => [...(bl.paragraphs ?? []), ...(bl.points ?? [])].map((p) => [p.text, m.title] as const))));
  const ta = text(a.modules);
  const tb = text(b.modules);
  const removed = [...ta.entries()].filter(([t]) => !tb.has(t));
  const added = [...tb.entries()].filter(([t]) => !ta.has(t));
  const modsA = new Set(a.modules.map((m) => m.title));
  const modsB = new Set(b.modules.map((m) => m.title));
  return (
    <Modal open onClose={onClose} title={`Compare v${a.version} → v${b.version}`} description="Block-level changes. This is the change summary printed in the MLR package." size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {[...modsB].filter((m) => !modsA.has(m)).map((m) => <Chip key={m} tone="ok" size="md">+ module · {m}</Chip>)}
          {[...modsA].filter((m) => !modsB.has(m)).map((m) => <Chip key={m} tone="danger" size="md">− module · {m}</Chip>)}
        </div>
        {added.map(([t, m]) => <div key={t} className="rounded-chip bg-ok-bg px-3 py-2 text-body text-ok"><span className="text-micro font-bold">{m} · </span>+ {t}</div>)}
        {removed.map(([t, m]) => <div key={t} className="rounded-chip bg-danger-bg px-3 py-2 text-body text-danger line-through"><span className="text-micro font-bold no-underline">{m} · </span>{t}</div>)}
        {!added.length && !removed.length && <Text tone="subtle">No text changes.</Text>}
      </div>
    </Modal>
  );
}
