"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { ORG, competency, product, source } from "@/data/org";
import { SCENARIOS, objection, prohibited } from "@/data/scenarios";
import { fmtDate } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { BlockView, SourceList, BLOCK_META } from "@/features/shared/block-view";
import { fmtTime } from "@/data/media";
import type { Block } from "@/data/types";
import { useCourse } from "./use-course";

/** ML-2: the review package the trainer submits to PromoMats. Prints to PDF. */
export function MlrPackage() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  if (!data) return null;
  const { course, cur } = data;
  const prev = course.versions.length > 1 ? course.versions[course.versions.length - 2] : undefined;
  const scs = SCENARIOS.filter((s) => course.scenarioIds.includes(s.id));
  const footer = <div className="mt-6 flex justify-between border-t border-hair pt-2 font-mono text-micro text-ink-4"><span>Version ID {cur.versionId}</span><span>For internal training use only · not for distribution to HCPs</span></div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/trainer/courses/${course.id}/review`} className="flex items-center gap-1.5 text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Review &amp; versions</Link>
        <Button onClick={() => window.print()}><Printer className="size-4" aria-hidden="true" />Print / save as PDF</Button>
      </div>
      <article className="mx-auto flex w-full max-w-[820px] flex-col gap-10 rounded-card border border-hair bg-card px-8 py-10 shadow-soft print:border-0 print:shadow-none sm:px-14">
        <section className="flex flex-col gap-5">
          <Text size="caption" weight="bold" tone="brand-deep" uppercase tracking="wider">MLR review package</Text>
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">{course.title}</Text>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-body">
            {[
              ["Company", ORG.name], ["Product", product(course.productId) ? `${product(course.productId)!.brand} (${product(course.productId)!.generic})` : "Company training"],
              ["Version", `v${cur.version}`], ["Version ID", cur.versionId],
              ["Prepared", fmtDate(cur.packageAt ?? new Date().toISOString(), true)], ["Owner", "Maya Chen, Commercial Training Lead"],
              ["Audience", course.audience], ["Duration & type", `${course.format === "long" ? "Long" : "Short"} · ${course.type === "personalised" ? "Personalised" : "Same for everyone"}`],
            ].map(([k, v]) => <div key={k} className="flex flex-col"><span className="text-caption text-ink-3">{k}</span><span className="font-semibold">{v}</span></div>)}
          </div>
          <div className="rounded-panel border border-warn-line bg-warn-bg px-4 py-3 text-body font-semibold text-warn">For internal training use only. Not for distribution to healthcare professionals.</div>
          <div className="flex flex-col gap-1"><Text size="caption" weight="bold" tone="subtle">Objective</Text><Text size="body-lg">{course.objective}</Text></div>
          {course.productId && (
            <div className="flex flex-col gap-1">
              <Text size="caption" weight="bold" tone="subtle">Approved indication{course.scope?.indications.length === 1 ? "" : "s"} in scope{course.scope?.variants.length ? ` · ${course.scope.variants.join(", ")}` : ""}</Text>
              {product(course.productId)!.indications.filter((i) => !course.scope?.indications.length || course.scope.indications.includes(i.short)).map((i) => <Text key={i.short} size="body-lg">{i.full}</Text>)}
            </div>
          )}
          {course.type === "personalised" && (
            <div className="rounded-panel border border-hair bg-subtle px-4 py-3">
              <Text size="body" weight="bold">Personalisation statement</Text>
              <Text as="p" size="body" tone="muted" className="mt-1">Learners receive subsets of the approved blocks in this package, selected and ordered by their measured competency gaps. No other content is shown. Blocks marked “Required for everyone” are always included.</Text>
            </div>
          )}
          {prev && <div className="flex flex-col gap-1"><Text size="caption" weight="bold" tone="subtle">Change summary vs v{prev.version}</Text><Text size="body">{cur.modules.length - prev.modules.length >= 0 ? `${cur.modules.length} modules (was ${prev.modules.length}).` : ""} See the block-level comparison in Review &amp; versions.</Text></div>}
          {cur.acknowledged.length > 0 && <div className="flex flex-col gap-1"><Text size="caption" weight="bold" tone="subtle">Acknowledged warnings</Text><Text size="body">{cur.acknowledged.length} wording warning(s) acknowledged by the author.</Text></div>}
          <div className="flex flex-col gap-2"><Text size="caption" weight="bold" tone="subtle">Sources</Text><SourceList sourceIds={course.sourceIds} /></div>
          {footer}
        </section>

        <section className="flex flex-col gap-6">
          <Text as="h2" size="display" weight="bold">1 · Content</Text>
          {course.modules.map((m, i) => (
            <div key={m.id} className="flex flex-col gap-4 break-inside-avoid">
              <div className="flex items-baseline gap-2">
                <Text size="title" weight="bold">Module {i + 1} · {m.title}</Text>
                {m.required && <span className="rounded-glyph bg-warn-bg px-1.5 text-micro font-bold text-warn">Required for everyone</span>}
              </div>
              <Text size="caption" tone="subtle">{competency(m.competency)?.name} · {m.minutes} min · {m.summary}</Text>
              {m.blocks.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 border-l-2 border-hair pl-4">
                  <Text size="body" weight="bold">{b.title}</Text>
                  {["video", "document", "visualaid", "audio"].includes(b.type) ? <MediaInPackage b={b} /> : <BlockView block={b} sourceIds={course.sourceIds} siblings={m.blocks} />}
                </div>
              ))}
            </div>
          ))}
          {footer}
        </section>

        {course.items.length > 0 && (
          <section className="flex flex-col gap-4">
            <Text as="h2" size="display" weight="bold">2 · Question bank with answer keys</Text>
            {course.items.map((it, i) => (
              <div key={it.id} className="flex flex-col gap-1 break-inside-avoid border-b border-hair pb-3">
                <Text size="body" weight="bold">Q{i + 1} · {it.pool} · {competency(it.competency)?.name}</Text>
                <Text size="body">{it.question}</Text>
                <Text size="body" tone="muted">{it.format === "open" ? `Written answer. Must cover: ${it.guide?.mustCover.map((m) => m.text).join("; ")}` : it.options.map((o, j) => `${String.fromCharCode(65 + j)}) ${o}${j === it.answer ? " ✓" : ""}`).join("   ")}</Text>
                <Text size="caption" tone="subtle">Rationale: {it.rationale} {it.cite ? `[${source(it.cite.sourceId)?.title}, p. ${it.cite.page}]` : ""}</Text>
              </div>
            ))}
            {footer}
          </section>
        )}

        {scs.length > 0 && (
          <section className="flex flex-col gap-4">
            <Text as="h2" size="display" weight="bold">3 · Roleplay scenarios, rubrics and AI behaviour</Text>
            {scs.map((sc) => (
              <div key={sc.id} className="flex flex-col gap-2 break-inside-avoid">
                <Text size="title" weight="bold">{sc.title}</Text>
                <Text size="body">{sc.persona.name}, {sc.persona.specialty}. {sc.persona.setting}. Traits: {sc.persona.traits.join(", ")}.</Text>
                <Text size="body" tone="muted">Objections: {sc.objectionIds.map((o) => `“${objection(o).line}”`).join(" ")}</Text>
                <Text size="body" tone="muted">Rubric: {sc.rubric.map((r) => `${r.label} (${r.weight}%)`).join(" · ")}</Text>
                <Text size="body" tone="muted">Prohibited: {sc.prohibitedIds.map((p) => `${prohibited(p).label}${prohibited(p).critical ? " [auto-fail]" : ""}`).join(" · ")}</Text>
                <Text size="body"><strong>AI HCP behaviour note.</strong> {sc.behaviourNote}</Text>
              </div>
            ))}
            {footer}
          </section>
        )}
      </article>
    </div>
  );
}

/** Media is reviewed as text plus file references: the script, timestamps, pages and what reps are told to say. */
function MediaInPackage({ b }: { b: Block }) {
  const meta = BLOCK_META[b.type];
  if (b.video) {
    const v = b.video;
    return (
      <div className="flex flex-col gap-1.5 text-body">
        <Text size="body" tone="muted">{meta.label} · {fmtTime(v.durationSec)} · {v.origin === "ai" ? "AI-generated (new content: approve the rendered file)" : v.origin === "clip" ? `Clip of “${v.clipOf?.title}”, ${fmtTime(v.clipOf!.from)}–${fmtTime(v.clipOf!.to)}` : `Uploaded file ${v.fileName ?? ""}`}</Text>
        <Text size="caption" tone="subtle">Chapters: {v.chapters.map((c) => `${fmtTime(c.at)} ${c.title}`).join(" · ")}</Text>
        <ol className="flex flex-col gap-0.5">{v.captions.map((c) => <li key={c.at} className="text-body text-ink-2"><span className="font-mono text-caption text-ink-3">{fmtTime(c.at)}</span> {c.text}</li>)}</ol>
      </div>
    );
  }
  if (b.document) return <Text size="body" tone="muted">Read in-app, view-only: {source(b.document.sourceId)?.title} ({source(b.document.sourceId)?.docNumber}), pages {b.document.pages.join(", ")}.{b.document.callouts.map((c) => ` Trainer note p. ${c.page}: “${c.text}”`).join("")}</Text>;
  if (b.visualaid) return (
    <div className="flex flex-col gap-1">
      <Text size="body" tone="muted">Walkthrough of {source(b.visualaid.sourceId)?.title} ({source(b.visualaid.sourceId)?.docNumber})</Text>
      {b.visualaid.pages.map((p) => <Text key={p.page} size="body">p. {p.page} · Say: {p.say}{p.avoid ? ` · Avoid: ${p.avoid}` : ""}</Text>)}
    </div>
  );
  if (b.audio) return <Text size="body" tone="muted">Audio: the approved text of this module read aloud by text-to-speech ({fmtTime(b.audio.durationSec)}). No new words.</Text>;
  return null;
}
