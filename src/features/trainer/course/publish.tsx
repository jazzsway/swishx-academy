"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live } from "@/store/app-store";
import { fmtDate } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import { Card, VersionChip, KeyValue } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { useCourse } from "./use-course";
import { runChecks } from "./checks";
import { CompareModal, FindingList } from "./review";

/*
 * v1 publishing: a draft goes live when the trainer publishes it. There is no MLR step,
 * no document number and no approval expiry. The MLR flow is kept in review.tsx (v1-hidden).
 */
export function PublishAndVersions() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id);
  const app = useApp();
  const { message, open, showToast } = useToast();
  const [transition, setTransition] = useState<"minor" | "recertify" | "restart">("minor");
  const [published, setPublished] = useState<null | { recert: boolean }>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("Content change");
  const [compare, setCompare] = useState<[number, number] | null>(null);

  const findings = useMemo(() => (data ? runChecks(data.course) : []), [data]);
  if (!data) return null;
  const { course, cur, editable } = data;
  const lv = live(course);
  const reds = findings.filter((f) => f.severity === "red");
  const base = `/trainer/courses/${course.id}`;
  const certifiedOn = (v: number) => app.progress.filter((p) => p.courseId === course.id && p.version === v && p.state === "certified").length;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        {editable && (
          <Card title={`Publish v${cur.version}`} eyebrow="Checks before it goes live"
            actions={<Chip tone={reds.length ? "danger" : "ok"} size="md">{reds.length ? `${reds.length} to fix` : "Ready"}</Chip>}>
            <FindingList findings={findings} ack={[]} setAck={() => {}} base={base} hideAck />
            {lv && (
              <div className="flex flex-col gap-2 border-t border-hair pt-4">
                <Text size="body-lg" weight="semibold">What happens to reps on v{lv.version}?</Text>
                {([
                  ["minor", "Keep their progress", "Progress carries over for unchanged blocks. Certifications stay valid."],
                  ["recertify", "Recertify everyone", "Certified reps take it again, due in 14 days. Use it when what reps must say has changed."],
                  ["restart", "Start over", "Progress resets for everyone. Use it for a major restructure."],
                ] as const).map(([k, t, d]) => (
                  <label key={k} className={cn("squircle flex cursor-pointer items-start gap-3 rounded-panel border p-3.5", transition === k ? "border-brand bg-tint" : "border-hair hover:bg-subtle")}>
                    <input type="radio" name="transition" className="mt-1 accent-[var(--color-brand)]" checked={transition === k} onChange={() => setTransition(k)} />
                    <span className="flex flex-col"><span className="text-body-lg font-semibold">{t}</span><span className="text-caption text-ink-3">{d}</span></span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-4">
              <Text size="body" tone="subtle">{reds.length ? `Fix the red items first.${reds.some((f) => f.fixable !== false && f.moduleId) ? " SwishX can fix wording and citations: open the module and use Fix with AI." : ""}` : lv ? `v${lv.version} stays live until you publish.` : "Once published, you can assign it."}</Text>
              <Button size="lg" disabled={reds.length > 0} onClick={() => { app.publish(course.id, lv ? transition : "minor"); setPublished({ recert: !!lv && transition === "recertify" }); }}>Publish v{cur.version}</Button>
            </div>
          </Card>
        )}

        {cur.state === "published" && (
          <Card title={`v${cur.version} is live`} actions={<Button variant="danger" size="sm" onClick={() => setWithdrawOpen(true)}>Withdraw</Button>}>
            <KeyValue items={[
              { k: "Published", v: fmtDate(cur.publishedAt, true) },
              { k: "Reps certified on it", v: certifiedOn(cur.version) },
            ]} />
            <Text size="body" tone="subtle">To change it, use Edit as v{cur.version + 1}. v{cur.version} stays live until you publish the new version.</Text>
          </Card>
        )}

        <Card title="Version history">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-body">
              <thead><tr className="text-left text-caption text-ink-3"><th className="py-2 font-semibold">Version</th><th className="font-semibold">State</th><th className="font-semibold">Published</th><th className="font-semibold">Certified</th><th /></tr></thead>
              <tbody>
                {[...course.versions].reverse().map((v) => (
                  <tr key={v.version} className="border-t border-hair">
                    <td className="py-2.5 font-semibold">v{v.version}</td>
                    <td><VersionChip state={v.state} /></td>
                    <td>{fmtDate(v.publishedAt, true)}</td>
                    <td className="tabular-nums">{certifiedOn(v.version) || "—"}</td>
                    <td className="text-right">{v.version !== course.versions[0].version && (
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
            {cur.history.length === 0 && <Text size="body" tone="subtle">Nothing yet.</Text>}
          </ol>
        </Card>
      </aside>

      <Modal open={!!published} onClose={() => { setPublished(null); router.push(`${base}/assign`); }} title={`v${cur.version} is published`} size="sm"
        footer={<>
          {published?.recert && <Button variant="secondary" onClick={() => { setPublished(null); router.push("/trainer/records"); }}>See records</Button>}
          <Button onClick={() => { setPublished(null); router.push(`${base}/assign`); }}>{published?.recert ? "Assign to more people" : "Assign it"}</Button>
        </>}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="success-pop grid size-14 place-items-center rounded-full bg-ok-bg text-ok"><CircleCheck className="size-7" aria-hidden="true" /></div>
          <Text size="body-lg" tone="muted">{published?.recert ? "Everyone certified on the old version must recertify on this one. They're back on their list, due in 14 days." : "Reps assigned to this course now see the new version."}</Text>
        </div>
      </Modal>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title={`Withdraw v${cur.version}?`} description="It leaves every rep's path immediately. Certifications keep their history." size="sm"
        footer={<><Button variant="secondary" onClick={() => setWithdrawOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => { app.withdraw(course.id, withdrawReason); setWithdrawOpen(false); showToast("Withdrawn"); }}>Withdraw</Button></>}>
        <div className="flex flex-wrap gap-2">{["Content change", "Error", "Other"].map((r) => <Chip key={r} size="lg" selected={withdrawReason === r} onClick={() => setWithdrawReason(r)}>{r}</Chip>)}</div>
      </Modal>

      {compare && <CompareModal versions={course.versions} pair={compare} onClose={() => setCompare(null)} />}
      <Toast message={message} open={open} />
    </div>
  );
}
