"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileText, Sparkles, Upload, Trash2, ChevronUp, ChevronDown, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { COMPETENCIES, PRODUCTS, SOURCES, competency, domainOf, product } from "@/data/org";
import { LUMORA_ITEMS } from "@/data/courses/lumora-items";
import { CARDEXA_ITEMS, CARDEXA_V2_MODULES, generatedAccessModules } from "@/data/courses/other-courses";
import type { Module, Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card } from "@/components/patterns/academy";

const STEPS = ["Goal", "Sources", "Competencies", "Outline", "Generate"];

export function NewCourseWizard() {
  const router = useRouter();
  const createCourse = useApp((s) => s.createCourse);
  const setModules = useApp((s) => s.setModules);
  const updateCourse = useApp((s) => s.updateCourse);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("Lumora: handling access & cost objections");
  const [objective, setObjective] = useState("Reps handle the cost and prior-authorization objection with the Access Hub, without promising coverage, and keep fair balance in the conversation.");
  const [productId, setProductId] = useState("p-lumora");
  const [format, setFormat] = useState<"long" | "short">("short");
  const [type, setType] = useState<"personalised" | "linear">("personalised");
  const [audience, setAudience] = useState<string[]>(["Field reps", "Immunology"]);
  const [extraSources, setExtraSources] = useState<Source[]>([]);
  const [sourceIds, setSourceIds] = useState<string[]>(["src-lum-pi", "src-lum-obj", "src-lum-payer", "src-code"]);
  const [comps, setComps] = useState<string[]>(["c-access", "c-objections", "c-safety", "c-compliance"]);
  const [outline, setOutline] = useState<Module[] | null>(null);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [genIndex, setGenIndex] = useState(-1);

  const prod = product(productId);
  const library = [...SOURCES.filter((s) => !s.productId || s.productId === productId), ...extraSources];
  const hasPI = !productId || sourceIds.includes(prod?.piSourceId ?? "");

  useEffect(() => {
    setSourceIds(productId === "p-cardexa" ? ["src-cdx-pi", "src-cdx-va", "src-code"] : productId === "p-lumora" ? ["src-lum-pi", "src-lum-obj", "src-lum-payer", "src-code"] : ["src-code"]);
    if (productId === "p-cardexa") { setTitle("Cardexa: updated label in practice"); setComps(["c-safety", "c-dosing", "c-compliance"]); }
    if (productId === "p-lumora") { setTitle("Lumora: handling access & cost objections"); setComps(["c-access", "c-objections", "c-safety", "c-compliance"]); }
  }, [productId]);

  function buildOutline() {
    setOutlineLoading(true);
    setOutline(null);
    window.setTimeout(() => {
      const prefix = `g${Date.now().toString(36).slice(-4)}`;
      const mods = productId === "p-cardexa"
        ? CARDEXA_V2_MODULES.map((m, i) => ({ ...m, id: `${prefix}-m${i + 1}`, blocks: m.blocks.map((b, j) => ({ ...b, id: `${prefix}-m${i + 1}-b${j + 1}` })) }))
        : generatedAccessModules(prefix);
      setOutline(format === "long" ? mods : mods);
      setOutlineLoading(false);
    }, 1600);
  }

  function generate() {
    if (!outline) return;
    setStep(4);
    const id = createCourse({ title, productId: productId || undefined, format, type, objective, audience: audience.join(", "), sourceIds, competencyIds: comps });
    const items = (productId === "p-cardexa" ? CARDEXA_ITEMS : LUMORA_ITEMS.filter((it) => comps.includes(it.competency))).map((it) => ({ ...it, id: `${id}-${it.id}` }));
    updateCourse(id, { items, settings: { ...useApp.getState().courses.find((c) => c.id === id)!.settings, screeningCall: false, assessmentCall: type === "personalised", assessmentScenarioId: "sc-kim" } });
    let i = 0;
    setGenIndex(0);
    const tick = () => {
      i++;
      setGenIndex(i);
      if (i < outline.length) window.setTimeout(tick, 900);
      else window.setTimeout(() => { setModules(id, outline); router.push(`/trainer/courses/${id}?fresh=1`); }, 900);
    };
    window.setTimeout(tick, 900);
  }

  const canNext = [objective.trim().length > 20 && title.trim().length > 3, sourceIds.length > 0 && hasPI, comps.length > 0, !!outline][step];

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => (step === 0 ? router.push("/trainer/courses") : setStep(step - 1))} disabled={step === 4}>
          <ArrowLeft className="size-4" aria-hidden="true" />{step === 0 ? "Courses" : "Back"}
        </Button>
        <ol className="ml-auto flex items-center gap-1.5" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cn("grid size-6 place-items-center rounded-full text-micro font-bold", i < step ? "bg-ok text-white" : i === step ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>
                {i < step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn("hidden text-caption font-semibold sm:inline", i === step ? "text-ink" : "text-ink-3")}>{s}</span>
              {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-5 bg-hair-2 sm:block" />}
            </li>
          ))}
        </ol>
      </div>

      {step === 0 && (
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">What should reps be able to do?</Text>
            <Text tone="subtle" size="body-lg">Describe the outcome. SwishX builds the course from your approved sources.</Text>
          </div>
          <Field label="Objective" multiline rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} />
          <button type="button" onClick={() => setObjective("By the end, reps can (1) acknowledge an access objection, (2) describe Access Hub services without promising coverage, and (3) deliver fair balance in the same conversation, scoring ≥ 80% on the roleplay rubric.")}
            className="-mt-2 flex items-center gap-1.5 self-start text-body font-semibold text-brand-deep hover:underline">
            <Wand2 className="size-4" aria-hidden="true" />Make it measurable
          </button>
          <Field label="Course title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex flex-col gap-2">
            <Text size="label" weight="semibold" tone="muted">Product</Text>
            <div className="flex flex-wrap gap-2">
              {PRODUCTS.map((p) => <Chip key={p.id} size="lg" selected={productId === p.id} onClick={() => setProductId(p.id)}>{p.brand} ({p.generic})</Chip>)}
              <Chip size="lg" selected={productId === ""} onClick={() => setProductId("")}>No product (company training)</Chip>
            </div>
            {prod && (
              <div className="squircle rounded-panel border border-hair bg-subtle px-4 py-3">
                <Text size="caption" weight="bold" tone="subtle">Approved indication · {prod.indications[0].short}</Text>
                <Text as="p" size="body" tone="muted" className="mt-1 leading-relaxed">{prod.indications[0].full}</Text>
              </div>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Text size="label" weight="semibold" tone="muted">Format</Text>
              <Segmented>
                <SegmentedButton active={format === "short"} onClick={() => setFormat("short")}>Short · 5–25 min</SegmentedButton>
                <SegmentedButton active={format === "long"} onClick={() => setFormat("long")}>Long-form · 30–120 min</SegmentedButton>
              </Segmented>
            </div>
            <div className="flex flex-col gap-2">
              <Text size="label" weight="semibold" tone="muted">Course type</Text>
              <Segmented>
                <SegmentedButton active={type === "personalised"} onClick={() => setType("personalised")}>Personalised (screening)</SegmentedButton>
                <SegmentedButton active={type === "linear"} onClick={() => setType("linear")}>Linear</SegmentedButton>
              </Segmented>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Text size="label" weight="semibold" tone="muted">Audience</Text>
            <div className="flex flex-wrap gap-2">
              {["Field reps", "Managers", "New hires", "Immunology", "Cardiometabolic"].map((a) => (
                <Chip key={a} size="lg" selected={audience.includes(a)} onClick={() => setAudience(audience.includes(a) ? audience.filter((x) => x !== a) : [...audience, a])}>{a}</Chip>
              ))}
            </div>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">What should SwishX build from?</Text>
            <Text tone="subtle" size="body-lg">Every sentence it writes will cite one of these, by page. It can't use anything else.</Text>
          </div>
          {!hasPI && <div className="squircle rounded-panel border border-danger-line bg-danger-bg px-4 py-3 text-body font-semibold text-danger">The Prescribing Information is required for any product course.</div>}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {library.map((s) => {
              const on = sourceIds.includes(s.id);
              return (
                <button key={s.id} type="button" aria-pressed={on} onClick={() => setSourceIds(on ? sourceIds.filter((x) => x !== s.id) : [...sourceIds, s.id])}
                  className={cn("squircle flex items-start gap-3 rounded-panel border p-3.5 text-left transition-colors", on ? "border-brand bg-tint" : "border-hair-2 bg-card hover:bg-subtle")}>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-control", on ? "bg-brand text-white" : "bg-subtle text-ink-3")}>
                    {on ? <Check className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body-lg font-semibold text-ink">{s.title}</span>
                    <span className="text-caption text-ink-3">{s.type} · {s.pages} pages{s.docNumber ? ` · ${s.docNumber}` : " · no doc number"}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <label className="squircle flex cursor-pointer items-center justify-center gap-2 rounded-panel border border-dashed border-hair-3 px-4 py-5 text-body-lg font-semibold text-ink-2 hover:bg-subtle">
            <Upload className="size-4" aria-hidden="true" />Upload PDF, PPTX, DOCX, video or data
            <input type="file" className="sr-only" multiple onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              const added = files.map((f, i) => ({ id: `up-${Date.now()}-${i}`, title: f.name.replace(/\.[^.]+$/, ""), type: "Visual aid" as const, pages: 6 + i, productId }));
              setExtraSources([...extraSources, ...added]);
              setSourceIds([...sourceIds, ...added.map((a) => a.id)]);
            }} />
          </label>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Which competencies does this build?</Text>
            <Text tone="subtle" size="body-lg">SwishX picked these from your objective. Screening, personalisation and analytics all run on them.</Text>
          </div>
          <div className="flex flex-col gap-4">
            {Array.from(new Set(COMPETENCIES.map((c) => c.domain))).map((d) => (
              <div key={d} className="flex flex-col gap-2">
                <Text size="caption" weight="bold" tone="subtle">{domainOf(COMPETENCIES.find((c) => c.domain === d)!.id).name}</Text>
                <div className="flex flex-wrap gap-2">
                  {COMPETENCIES.filter((c) => c.domain === d).map((c) => (
                    <Chip key={c.id} size="lg" selected={comps.includes(c.id)} iconLeft={comps.includes(c.id) ? <Sparkles className="size-3.5" aria-hidden="true" /> : undefined}
                      onClick={() => setComps(comps.includes(c.id) ? comps.filter((x) => x !== c.id) : [...comps, c.id])}>{c.name}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Check the outline before SwishX writes it</Text>
            <Text tone="subtle" size="body-lg">Reorder, rename or remove modules. Nothing is written until you generate.</Text>
          </div>
          {!outline && !outlineLoading && (
            <Button size="lg" onClick={buildOutline} className="self-start"><Sparkles className="size-4" aria-hidden="true" />Draft the outline</Button>
          )}
          {outlineLoading && (
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-[72px] rounded-panel border border-hair bg-subtle" />)}
              <Text size="body" tone="subtle" className="dot-cycle">Reading {sourceIds.length} sources<span>.</span><span>.</span><span>.</span></Text>
            </div>
          )}
          {outline && (
            <ol className="stagger-children flex flex-col gap-2.5">
              {outline.map((m, i) => (
                <li key={m.id} className="squircle flex items-start gap-3 rounded-panel border border-hair bg-card p-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-control bg-tint text-body font-bold text-brand-deep">{i + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <input aria-label={`Module ${i + 1} title`} value={m.title} onChange={(e) => setOutline(outline.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))}
                      className="w-full rounded-chip bg-transparent text-body-lg font-semibold outline-none focus:bg-subtle" />
                    <Text size="caption" tone="subtle">{m.summary}</Text>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip size="xs">{competency(m.competency).name}</Chip>
                      <Chip size="xs">{m.minutes} min</Chip>
                      {m.required && <Chip size="xs" tone="warn">Required for everyone</Chip>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { const o = [...outline]; [o[i - 1], o[i]] = [o[i], o[i - 1]]; setOutline(o); }} className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-subtle disabled:opacity-30"><ChevronUp className="size-4" /></button>
                    <button type="button" aria-label="Move down" disabled={i === outline.length - 1} onClick={() => { const o = [...outline]; [o[i + 1], o[i]] = [o[i], o[i + 1]]; setOutline(o); }} className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-subtle disabled:opacity-30"><ChevronDown className="size-4" /></button>
                  </div>
                  <button type="button" aria-label="Remove module" disabled={m.required} title={m.required ? "Safety modules can't be removed" : undefined}
                    onClick={() => setOutline(outline.filter((x) => x.id !== m.id))} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-danger-bg hover:text-danger disabled:opacity-30"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ol>
          )}
          {outline && <Text size="body" tone="subtle">{outline.length} modules · {outline.reduce((a, m) => a + m.minutes, 0)} min · from {sourceIds.length} sources</Text>}
        </Card>
      )}

      {step === 4 && outline && (
        <Card>
          <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Writing your course</Text>
          <Text tone="subtle" size="body-lg">Every sentence is cited to a source page. Questions and the roleplay rubric come next.</Text>
          <ol className="flex flex-col gap-2">
            {outline.map((m, i) => (
              <li key={m.id} className={cn("squircle flex items-center gap-3 rounded-panel border p-3.5 transition-colors", i < genIndex ? "border-ok-line bg-ok-bg" : i === genIndex ? "shimmer border-tint-line bg-tint" : "border-hair bg-card")}>
                <span className={cn("grid size-7 place-items-center rounded-full", i < genIndex ? "bg-ok text-white" : "bg-black/[0.06] text-ink-3")}>
                  {i < genIndex ? <Check className="size-4" aria-hidden="true" /> : <span className="text-micro font-bold">{i + 1}</span>}
                </span>
                <Text size="body-lg" weight="semibold" className="flex-1">{m.title}</Text>
                <Text size="caption" tone="subtle">{i < genIndex ? `${m.blocks.length} blocks · cited` : i === genIndex ? "Writing…" : "Queued"}</Text>
              </li>
            ))}
            <li className={cn("squircle flex items-center gap-3 rounded-panel border p-3.5", genIndex >= outline.length ? "shimmer border-tint-line bg-tint" : "border-hair")}>
              <span className="grid size-7 place-items-center rounded-full bg-black/[0.06] text-micro font-bold text-ink-3">+</span>
              <Text size="body-lg" weight="semibold" className="flex-1">Question bank, roleplay rubric, MLR notes</Text>
            </li>
          </ol>
        </Card>
      )}

      {step < 4 && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <div className="flex items-center gap-3 rounded-control bg-ink px-4 py-2.5 text-white shadow-float">
            <Text size="body" tone="inverse" className="hidden opacity-75 sm:inline">
              {step === 0 && "Next: pick the sources AI may use"}
              {step === 1 && `${sourceIds.length} sources selected`}
              {step === 2 && `${comps.length} competencies`}
              {step === 3 && (outline ? "Ready to write the course" : "Draft the outline first")}
            </Text>
            <Button disabled={!canNext} onClick={() => (step === 3 ? generate() : setStep(step + 1))}>
              {step === 3 ? <><Sparkles className="size-4" aria-hidden="true" />Generate course</> : <>Continue<ArrowRight className="size-4" aria-hidden="true" /></>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

