"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Search } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { Text, Label } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { Modal } from "@/components/ui/modal";
import { TabNav } from "@/components/patterns/tab-nav";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { DataTable } from "@/components/patterns/data-table";
import { useToast, Toast } from "@/components/patterns/toast";
import { Card, Stat, Meter, Ring, BandChip, VersionChip, ProgressChip, Avatar, EmptyState, Sparkline, Citation } from "@/components/patterns/academy";
import { BlockView } from "@/features/shared/block-view";
import { Scorecard } from "@/features/roleplay/scorecard";
import { seededCall } from "@/features/roleplay/engine";
import { scenario } from "@/data/scenarios";
import { LUMORA_LAUNCH_MODULES } from "@/data/courses/lumora-launch";
import { BrandLockup } from "@/features/shell/brand";

const GROUPS: { label: string; names: string[] }[] = [
  { label: "Brand", names: ["--color-brand", "--color-brand-2", "--color-brand-deep", "--color-brand-ink", "--color-brand-light"] },
  { label: "Surfaces", names: ["--color-canvas", "--color-card", "--color-subtle", "--color-ink"] },
  { label: "Ink ramp", names: ["--color-ink", "--color-ink-2", "--color-ink-3", "--color-ink-4"] },
  { label: "Tints", names: ["--color-tint", "--color-tint-2", "--color-tint-strong", "--color-tint-line"] },
  { label: "Status", names: ["--color-ok", "--color-ok-bg", "--color-warn", "--color-warn-bg", "--color-danger", "--color-danger-bg"] },
];
const TYPE = ["micro", "caption", "label", "body", "body-lg", "subhead", "title", "display", "display-lg", "hero", "hero-lg"] as const;
const RADII = ["glyph", "chip", "control", "panel", "card"];
const SHADOWS = ["hair", "soft", "float", "modal", "brand-lift"];

function Swatch({ name }: { name: string }) {
  const [v, setV] = useState("");
  useEffect(() => setV(getComputedStyle(document.documentElement).getPropertyValue(name).trim()), [name]);
  return (
    <div className="flex w-[132px] flex-col gap-1.5">
      <div className="squircle h-14 rounded-control border border-hair" style={{ background: `var(${name})` }} />
      <Text size="caption" weight="semibold">{name.replace("--color-", "")}</Text>
      <Text size="micro" tone="subtle" className="font-mono">{v || "…"}</Text>
    </div>
  );
}

function Section({ n, title, note, children }: { n: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={title.toLowerCase().replace(/\W+/g, "-")} className="flex flex-col gap-4 border-t border-hair-2 pt-8">
      <div className="flex items-baseline gap-3"><Text size="caption" tone="brand" weight="bold" className="font-mono">{n}</Text><Text as="h2" size="display" weight="bold">{title}</Text></div>
      {note && <Text as="p" size="body-lg" tone="subtle" className="max-w-[72ch] leading-relaxed">{note}</Text>}
      {children}
    </section>
  );
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-2"><Label size="micro">{label}</Label><div className="flex flex-wrap items-center gap-2">{children}</div></div>;
}

export function DesignSystem() {
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("one");
  const [seg, setSeg] = useState("a");
  const { message, open, showToast } = useToast();
  const call = seededCall(scenario("sc-kim"), "Priya", true);
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 flex h-(--screen-header-h) items-center justify-between border-b border-hair bg-card/95 px-5 backdrop-blur">
        <div className="flex items-center gap-4"><Link href="/trainer" className="flex items-center gap-1.5 text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Back to Academy</Link><BrandLockup sub="Design system" /></div>
        <Text size="caption" tone="subtle" className="font-mono">/design-system</Text>
      </header>
      <div className="mx-auto flex max-w-[1080px] flex-col gap-10 px-5 py-10">
        <div className="flex flex-col gap-3">
          <Text as="h1" size="hero-lg" weight="extrabold" tracking="tight">One system, two products</Text>
          <Text as="p" size="subhead" tone="muted" className="max-w-[72ch] leading-relaxed">
            Academy reuses the SwishX for Business tokens and primitives unchanged (Button, Chip, Text, Surface, Field, Modal, TabNav, Segmented, DataTable, Toast) and adds a small set of learning patterns on top. The type scale keeps the same eleven names but is re-based so nothing functional renders below 12px and reading text sits at 15–16px. Colour values below are read from the running stylesheet. Rules live in <span className="font-mono">docs/DESIGN.md</span>.
          </Text>
        </div>

        <Section n="01" title="Colour" note="Orange is the brand and the primary action. Ink is for focus surfaces (proof of progress, the rep's mission, calls). Status colours mean what they say: ok is certified or correct, warn is waiting or developing, danger is overdue, failed or non-compliant.">
          <div className="flex flex-col gap-5">{GROUPS.map((g) => <div key={g.label} className="flex flex-col gap-2"><Label size="micro">{g.label}</Label><div className="flex flex-wrap gap-3">{g.names.map((n) => <Swatch key={n + g.label} name={n} />)}</div></div>)}</div>
        </Section>

        <Section n="02" title="Type" note="Figtree throughout. Body copy 15–16px, controls 14–15px, nothing functional under 12px.">
          <div className="flex flex-col gap-2">{TYPE.map((t) => <div key={t} className="flex items-baseline gap-4"><Text size="caption" tone="subtle" className="w-24 shrink-0 font-mono">{t}</Text><Text size={t} weight="semibold">Lumora launch readiness</Text></div>)}</div>
        </Section>

        <Section n="03" title="Shape & elevation" note="Five radii named for what they wrap. Continuous (squircle) corners where the browser supports them.">
          <div className="flex flex-wrap gap-5">{RADII.map((r) => <div key={r} className="flex flex-col items-center gap-1.5"><div className="squircle size-16 border border-tint-line bg-tint" style={{ borderRadius: `var(--radius-${r})` }} /><Text size="micro" tone="subtle" className="font-mono">rounded-{r}</Text></div>)}</div>
          <div className="flex flex-wrap gap-5">{SHADOWS.map((sh) => <div key={sh} className="flex flex-col items-center gap-1.5"><div className="squircle size-16 rounded-panel bg-card" style={{ boxShadow: `var(--shadow-${sh})` }} /><Text size="micro" tone="subtle" className="font-mono">shadow-{sh}</Text></div>)}</div>
        </Section>

        <Section n="04" title="Primitives" note="Ported from SwishX for Business. Feature code never sets a colour, size, radius or shadow directly; it picks a prop.">
          <Spec label="Button · variant">{(["primary", "secondary", "soft", "ghost", "danger"] as const).map((v) => <Button key={v} variant={v}>{v}</Button>)}</Spec>
          <Spec label="Button · size">{(["sm", "md", "lg"] as const).map((sz) => <Button key={sz} size={sz}>{sz}</Button>)}<Button size="icon" aria-label="Add"><Plus className="size-4" /></Button><Button disabled>disabled</Button></Spec>
          <Spec label="IconButton">{(["default", "brand", "danger"] as const).map((t) => <IconButton key={t} tone={t} aria-label={t}><X className="size-4" /></IconButton>)}<IconButton aria-label="Sparkle" size={9}><AgentIcon className="size-4" /></IconButton></Spec>
          <Spec label="Chip · tone / selected">{(["default", "brand", "ok", "warn", "danger"] as const).map((t) => <Chip key={t} tone={t} size="md">{t}</Chip>)}{(["default", "brand"] as const).map((t) => <Chip key={t + "s"} tone={t} size="md" selected onClick={() => {}}>selected</Chip>)}</Spec>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Field" placeholder="Search courses" iconLeft={<Search className="size-4" />} hint="Label, hint and error are props." />
            <Field label="Field · error" defaultValue="LUM-US" error="Document number looks incomplete." />
          </div>
          <Spec label="Surface · tone">{(["card", "subtle", "tint", "ok", "warn", "danger"] as const).map((t) => <Surface key={t} tone={t} padding="md" radius="panel"><Text size="caption" weight="semibold">{t}</Text></Surface>)}</Spec>
        </Section>

        <Section n="05" title="Patterns" note="Ported composites. TabNav for places, Segmented for one choice, DataTable for every table, Toast from the top, Modal for anything that blocks.">
          <TabNav ariaLabel="Demo" activeId={tab} onSelect={setTab} items={[{ id: "one", label: "Content" }, { id: "two", label: "Questions", badge: 50 }, { id: "three", label: "Review & versions" }]} className="self-start" />
          <Segmented aria-label="Demo segmented"><SegmentedButton active={seg === "a"} onClick={() => setSeg("a")}>Latest assessment</SegmentedButton><SegmentedButton active={seg === "b"} onClick={() => setSeg("b")}>Screening</SegmentedButton></Segmented>
          <DataTable rows={[{ n: "Priya Shah", s: "Learning", v: 45 }, { n: "Alex Nguyen", s: "Certified", v: 88 }]} rowKey={(r) => r.n} columns={[{ key: "n", header: "Rep", cell: (r) => <strong className="text-ink">{r.n}</strong> }, { key: "s", header: "Stage", cell: (r) => r.s }, { key: "v", header: "Score", numeric: true, cell: (r) => r.v }]} />
          <div className="flex gap-2"><Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button><Button variant="secondary" onClick={() => showToast("Assigned to 142 people")}>Show toast</Button></div>
        </Section>

        <Section n="06" title="Academy patterns" note="New for Academy, built only from the primitives above.">
          <div className="grid gap-4 md:grid-cols-3">
            <Card padded><Stat label="Certified" value="58%" sub="104 of 180" /></Card>
            <Card tone="ink" padded><Stat label="Lift" value="+27" unit="pts" tone="inverse" sub="54 → 81" /></Card>
            <Card padded title="Card" eyebrow="Eyebrow"><Text tone="muted">Every panel is a Card.</Text></Card>
          </div>
          <Spec label="Meter · Ring · Sparkline"><div className="w-48"><Meter value={58} label="58%" /></div><Ring value={72} label="72%"><Text size="caption" weight="bold">72</Text></Ring><Sparkline values={[4, 9, 17, 26, 37, 48, 58]} width={140} height={44} label="trend" /></Spec>
          <Spec label="BandChip (proficiency)">{[38, 64, 86, 97].map((x) => <BandChip key={x} score={x} size="md" />)}</Spec>
          <Spec label="VersionChip (MLR lifecycle)">{(["draft", "ready", "in_review", "changes", "approved", "published", "withdrawn"] as const).map((x) => <VersionChip key={x} state={x} size="md" />)}<VersionChip state="published" expiring size="md" /></Spec>
          <Spec label="ProgressChip">{(["not_started", "learning", "awaiting_verify", "needs_coaching", "certified"] as const).map((x) => <ProgressChip key={x} state={x} size="md" />)}<ProgressChip state="learning" overdue size="md" /></Spec>
          <Spec label="Avatar · Citation"><Avatar initials="PS" /><Avatar initials="DO" tone="ink" /><Text size="body-lg">EASI-75: 51% vs 17%<Citation n={1} title="Lumora Prescribing Information" page={11} /></Text></Spec>
          <EmptyState icon={<AgentIcon className="size-5" />} title="EmptyState" body="Says what's missing and what to do next. Never fake numbers." />
        </Section>

        <Section n="07" title="Learning blocks" note="The approved unit. Rendered identically in the editor, the MLR package, the rep player and preview.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card padded title="Key points"><BlockView block={LUMORA_LAUNCH_MODULES[3].blocks[1]} sourceIds={["src-lum-pi", "src-lum-va", "src-lum-p3"]} /></Card>
            <Card padded title="Knowledge check"><BlockView block={LUMORA_LAUNCH_MODULES[5].blocks[2]} sourceIds={["src-lum-pi"]} interactive /></Card>
          </div>
        </Section>

        <Section n="08" title="Roleplay scorecard" note="One scorecard for practice (coaching), assessment (pass/fail) and manager verification.">
          <Card><Scorecard result={call} mode="practice" /></Card>
        </Section>

        <Section n="09" title="Rules">
          <ul className="flex flex-col gap-2 text-body-lg text-ink-2">
            <li>· One screen, one decision, one primary action (orange). Everything else is secondary or ghost.</li>
            <li>· Trainer opens on analytics. Reps open on one mission. Managers open on their queue.</li>
            <li>· Every number clicks through to the people or items behind it.</li>
            <li>· Practice is never shown per rep outside the rep's own screens. Aggregates need 5+ people.</li>
            <li>· No XP, confetti or badges on attestation, safety or compliance screens.</li>
            <li>· Every rep-facing record shows the version and document number.</li>
            <li>· Phone-first for reps (44px targets, thumb-reach primary button); desktop-first for trainers and managers.</li>
          </ul>
        </Section>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Modal" description="Escape, click-outside, focus trap and scroll lock built in." footer={<Button onClick={() => setModal(false)}>Done</Button>}><Text tone="muted">Body scrolls; header and footer stay pinned.</Text></Modal>
      <Toast message={message} open={open} />
    </div>
  );
}
