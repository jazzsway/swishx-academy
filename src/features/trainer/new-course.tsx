"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, FileText, Upload, Trash2, ChevronUp, ChevronDown, Wand2, Lock, Plus, Info, MoreVertical, Play } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { COMPETENCIES, DIVISIONS, SOURCES, competency, domainOf, product } from "@/data/org";
import { FORMAT_ICON, FORMAT_LABEL, SourcePreview, fileUrl, formatOf, rememberFile } from "./source-preview";
import { PLACE_OPTIONS, defaultPlace, howRepsGetIt, placeMaterials, type Place } from "./materials";
import { ProductPicker, type ProductScope } from "./product-picker";
import { LUMORA_ITEMS } from "@/data/courses/lumora-items";
import { CARDEXA_ITEMS, CARDEXA_V2_MODULES, depthModules, generatedAccessModules, genericProductItems, genericProductModules } from "@/data/courses/other-courses";
import { LUMORA_LAUNCH_MODULES } from "@/data/courses/lumora-launch";
import { shapeOutline } from "@/lib/outline";
import { courseCardCount, moduleCards, templateFor } from "@/lib/short-form";
import { ContentTypePicker, TemplatePicker, VisibilityPicker, type Form } from "./content-type";
import { suggestCompetencies } from "@/lib/suggest-competencies";
import type { Module, ShortTemplate, Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/patterns/academy";
import { Portal } from "@/components/ui/portal";

/* The outline is drafted from the same material either way; short form then breaks it into cards. */
const TARGET_MINUTES = 60;

const STEPS = ["Goal", "Materials", "Competencies", "Outline", "Generate"];
/* v1-hidden: Competencies is no longer its own step; it sits at the top of Outline. Step numbers stay the same inside. */
const SHOWN = [0, 1, 3, 4];
const prevStep = (n: number) => SHOWN[SHOWN.indexOf(n) - 1] ?? 0;
const nextStep = (n: number) => SHOWN[SHOWN.indexOf(n) + 1] ?? n;

/** Personalised skips what a rep already knows; linear takes everyone through everything. */
export const COURSE_TYPE = { // v1-hidden: only read by the commented-out course type picker
  personalised: { label: "Personalised", hint: "A short screening first. Each rep gets only the modules they need, plus safety, then a final assessment and roleplay call.", useFor: "For skills: launches, objection handling." },
  linear: { label: "Same for everyone", hint: "Every module in order, with quick checks along the way. No screening and no final assessment.", useFor: "For must-read content: label updates, compliance policy." },
} as const;

/** Sets depth and tone of what SwishX writes. Who must take it is decided later, at assignment. */
const WRITTEN_FOR = {
  reps: { label: "Field reps", hint: "Experienced reps. Assumes they know the disease area." },
  new_hires: { label: "New hires", hint: "Starts from the basics. Pairs with foundation courses." },
  managers: { label: "Managers", hint: "The coaching angle: what to listen for in the field." },
} as const;

const VERBS: Record<string, string> = {
  "c-efficacy": "state the approved efficacy results in the label's words",
  "c-safety": "deliver the safety information in balance with every benefit",
  "c-dosing": "explain dosing and administration correctly",
  "c-access": "describe access and support services without promising coverage",
  "c-objections": "acknowledge and answer the common objections",
  "c-compliance": "stay on-label and route other questions to Medical Information",
  "c-disease": "explain the disease and the patient it affects",
  "c-moa": "explain the mechanism in plain HCP language",
  "c-competitive": "position the product without unapproved comparisons",
  "c-opening": "open on the right patient type and ask good questions",
};

/** A measurable objective built from what the trainer picked, not a fixed sample. */
function measurable(brand: string | undefined, comps: string[], indications: string[]) {
  const asks = comps.map((c) => VERBS[c]).filter(Boolean).slice(0, 3);
  const subject = brand ? `${brand}${indications.length ? ` (${indications.join(", ")})` : ""}` : "this topic";
  const list = asks.length ? asks.map((a, i) => `(${i + 1}) ${a}`).join(", ") : "(1) explain the essentials accurately";
  return `By the end, reps can, for ${subject}, ${list}, scoring at least 80% on the assessment.`;
}

export function NewCourseWizard() {
  const router = useRouter();
  /* The copilot can start the builder on a product: /trainer/courses/new?product=p-arthelis */
  const startProduct = product(useSearchParams().get("product") ?? undefined)?.id;
  const createCourse = useApp((s) => s.createCourse);
  const setModules = useApp((s) => s.setModules);
  const updateCourse = useApp((s) => s.updateCourse);

  const [step, setStep] = useState(0);
  /* Nothing is picked until the trainer searches for a product (or the copilot passes one in). */
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [scope, setScope] = useState<ProductScope>({ mode: "product", productId: startProduct, variants: [], indications: [], therapyAreas: [] });
  const productId = scope.mode === "product" ? scope.productId ?? "" : "";
  const [form, setForm] = useState<Form>("long");
  const minutes = TARGET_MINUTES;
  /* The template follows the title until the trainer picks one. */
  const [pickedTemplate, setTemplate] = useState<ShortTemplate | null>(null);
  const template = pickedTemplate ?? templateFor(title);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  /* Long form is personalised (screening, final assessment, call); short form is the same cards for everyone. v1-hidden: the type and audience pickers are commented out below. */
  const type: "personalised" | "linear" = form === "short" ? "linear" : "personalised";
  const [writtenFor] = useState<"reps" | "new_hires" | "managers">("reps");
  const [teams, setTeams] = useState<string[]>(["div-imm"]);
  const users = useApp((s) => s.users);
  /* Only divisions with people in the Academy can be an audience. */
  const fieldTeams = DIVISIONS.map((d) => ({ ...d, people: users.filter((u) => u.active && u.divisionId === d.id && u.roles.includes(writtenFor === "managers" ? "manager" : "rep")).length }))
    .filter((d) => users.some((u) => u.divisionId === d.id));
  const reach = teams.length ? fieldTeams.filter((d) => teams.includes(d.id)).reduce((a, d) => a + d.people, 0) : fieldTeams.reduce((a, d) => a + d.people, 0);
  const uploads = useApp((s) => s.uploads);
  const addUploads = useApp((s) => s.addUploads);
  const removeUpload = useApp((s) => s.removeUpload);
  const [preview, setPreview] = useState<Source | null>(null);
  const [sourceIds, setSourceIds] = useState<string[]>(["src-code"]);
  const [comps, setComps] = useState<string[]>([]);
  /* Suggested from the title and objective each time the trainer reaches the step, until they change the picks themselves. */
  const [compsTouched, setCompsTouched] = useState(false);
  const suggestions = suggestCompetencies(title, objective, scope.mode === "product" && !!productId);
  useEffect(() => { if (step === 3 && !compsTouched) setComps(suggestions.map((x) => x.id)); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const [compsOpen, setCompsOpen] = useState(false);
  const toggleComp = (id: string) => { setCompsTouched(true); setComps(comps.includes(id) ? comps.filter((x) => x !== id) : [...comps, id]); };
  const [outline, setOutline] = useState<Module[] | null>(null);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [shapeNote, setShapeNote] = useState<{ left: string[]; added: string[] }>({ left: [], added: [] });
  /* The outline is drafted for the form and the competencies, so changing either means drafting again. */
  useEffect(() => { setOutline(null); }, [form, comps.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [genIndex, setGenIndex] = useState(-1);

  const prod = product(productId);
  const library = [...SOURCES, ...uploads].filter((s) => !s.productId || s.productId === productId);
  /* Each picked piece goes in the course (reps see it) or stays background (only SwishX reads it). SwishX reads both. */
  const [places, setPlaces] = useState<Record<string, Place>>({});
  const placeOf = (s: Source) => places[s.id] ?? defaultPlace(s);
  const picked = library.filter((s) => sourceIds.includes(s.id));
  const learnIds = picked.map((s) => s.id);
  const showItems = picked.filter((s) => placeOf(s) !== "background");
  const background = picked.filter((s) => placeOf(s) !== "course");
  const suggested = library.filter((s) => !sourceIds.includes(s.id) && !s.uploaded);
  const [yours, setYours] = useState<Record<string, string[]>>({});
  const hasPI = !productId || learnIds.includes(prod?.piSourceId ?? "");

  useEffect(() => {
    const pr = product(productId);
    setSourceIds(productId === "p-cardexa" ? ["src-cdx-pi", "src-cdx-va", "src-code"] : productId === "p-lumora" ? ["src-lum-pi", "src-lum-obj", "src-lum-payer", "src-code"] : pr ? [pr.piSourceId, "src-code"] : scope.mode === "area" ? ["src-ad-guide", "src-code"] : ["src-code"]);
    if (productId === "p-cardexa") {
      setTitle("Cardexa: updated label in practice");
      setObjective("Reps know what changed in the October 2026 Cardexa label and deliver the updated safety information in balance.");
    } else if (productId === "p-lumora") {
      setTitle("Lumora: handling access & cost objections");
      setObjective("Reps handle the cost and prior-authorization objection with the Access Hub, without promising coverage, and keep fair balance in the conversation.");
    }
    else if (pr) {
      setTitle(`${pr.brand}: label essentials`);
      setObjective(`Reps can state what ${pr.brand} is approved for in the label's own words, know its presentations, and deliver its safety information in balance.`);
    }
    setTeams(pr?.divisionId ? [pr.divisionId] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, scope.mode]);

  /* Uploads land in the section they were dropped in. */
  function addFiles(files: File[], place: Place) {
    const added: Source[] = files.map((f, i) => {
      const id = `up-${Date.now().toString(36)}-${i}`;
      rememberFile(id, f);
      return { id, title: f.name.replace(/\.[^.]+$/, ""), type: "Uploaded file", pages: 0, productId: productId || undefined, uploaded: { fileName: f.name, format: formatOf(f.name), at: new Date().toISOString() } };
    });
    addUploads(added);
    setPlaces({ ...places, ...Object.fromEntries(added.map((a) => [a.id, place])) });
    setSourceIds([...sourceIds, ...added.map((a) => a.id)]);
  }

  /* Uploads are deleted; library documents go back to the suggestions. */
  function unpick(s: Source) {
    if (s.uploaded) removeUpload(s.id);
    setSourceIds(sourceIds.filter((x) => x !== s.id));
  }

  function buildOutline() {
    setOutlineLoading(true);
    setOutline(null);
    window.setTimeout(() => {
      const prefix = `g${Date.now().toString(36).slice(-4)}`;
      const pr = product(productId);
      const mods = productId === "p-cardexa"
        ? CARDEXA_V2_MODULES.map((m, i) => ({ ...m, id: `${prefix}-m${i + 1}`, blocks: m.blocks.map((b, j) => ({ ...b, id: `${prefix}-m${i + 1}-b${j + 1}` })) }))
        : productId === "p-lumora" || !pr ? generatedAccessModules(prefix) : genericProductModules(prefix, pr, scope.indications, scope.variants);
      const launch = LUMORA_LAUNCH_MODULES.filter((m) => comps.includes(m.competency));
      const shaped = shapeOutline(mods, minutes, depthModules(prefix, pr, launch));
      /* Your own pieces go in after shaping, so trimming never drops them. */
      const placed = placeMaterials(shaped.modules, showItems);
      /* Short form has no roleplay call, so practice-call blocks (and modules left empty) go. */
      setOutline(form === "short" ? placed.modules.map((m) => ({ ...m, blocks: m.blocks.filter((b) => b.type !== "scenario") })).filter((m) => m.blocks.length) : placed.modules);
      setYours(placed.yours);
      setShapeNote({ left: shaped.left, added: shaped.added });
      setOutlineLoading(false);
    }, 1600);
  }

  function generate() {
    if (!outline) return;
    setStep(4);
    const id = createCourse({ title, productId: productId || undefined, format: form, template: form === "short" ? template : undefined, visibility: visibility === "public" ? "audience" : "assigned", type, objective, audience: `${WRITTEN_FOR[writtenFor].label} · ${teams.length ? teams.map((t) => DIVISIONS.find((d) => d.id === t)?.name).join(" + ") : "everyone"}`, writtenFor, teams, sourceIds, competencyIds: comps,
      scope: { variants: scope.variants, indications: scope.indications, therapyAreas: scope.therapyAreas } });
    const pr = product(productId);
    const items = (productId === "p-cardexa" ? CARDEXA_ITEMS : productId === "p-lumora" || !pr ? LUMORA_ITEMS.filter((it) => comps.includes(it.competency)) : genericProductItems(id, pr)).map((it) => ({ ...it, id: `${id}-${it.id}` }));
    const hasCall = form === "long" && productId === "p-lumora";
    updateCourse(id, { items, settings: { ...useApp.getState().courses.find((c) => c.id === id)!.settings, screeningCall: false, assessmentCall: hasCall, assessmentScenarioId: hasCall ? "sc-kim" : undefined } });
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

  const canNext = [objective.trim().length > 20 && title.trim().length > 3 && (scope.mode === "company" || (scope.mode === "product" ? !!productId : scope.therapyAreas.length > 0)), sourceIds.length > 0 && hasPI, comps.length > 0, !!outline && comps.length > 0][step];

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => (step === 0 ? router.push("/trainer/courses/new") : setStep(prevStep(step)))} disabled={step === 4}>
          <ArrowLeft className="size-4" aria-hidden="true" />Back
        </Button>
        <ol className="ml-auto flex items-center gap-1.5" aria-label="Steps">
          {SHOWN.map((n, i) => (
            <li key={n} className="flex items-center gap-1.5">
              <span className={cn("grid size-6 place-items-center rounded-full text-micro font-bold", n < step ? "bg-ok text-white" : n === step ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>
                {n < step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn("hidden text-caption font-semibold sm:inline", n === step ? "text-ink" : "text-ink-3")}>{STEPS[n]}</span>
              {i < SHOWN.length - 1 && <span className="mx-1 hidden h-px w-5 bg-hair-2 sm:block" />}
            </li>
          ))}
        </ol>
      </div>

      {step === 0 && (
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">What should reps be able to do?</Text>
            <Text tone="subtle" size="body-lg">Describe the outcome. SwishX builds the course from your materials.</Text>
          </div>
          <div className="flex flex-col gap-2">
            <Text size="label" weight="semibold" tone="muted">What is this course about?</Text>
            <ProductPicker value={scope} onChange={setScope} />
          </div>
          <Field label="Objective" multiline rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What reps should be able to do by the end, e.g. handle the cost objection without promising coverage." />
          <button type="button" onClick={() => setObjective(measurable(prod?.brand, comps, scope.indications))}
            className="-mt-2 flex items-center gap-1.5 self-start text-body font-semibold text-brand-deep hover:underline">
            <Wand2 className="size-4" aria-hidden="true" />Make it measurable
          </button>
          <Field label="Course title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lumora: handling access & cost objections" />
          <div className="flex flex-col gap-2">
            <Text size="label" weight="semibold" tone="muted">Type of content</Text>
            <ContentTypePicker value={form} onChange={setForm} template={template} title={title} />
          </div>
          {form === "short" && <TemplatePicker value={template} onChange={setTemplate} title={title} />}
          {/* v1-hidden: course type (Personalised / Same for everyone) and "Who is it written for".
          <div className="flex flex-col gap-2">
            <Text size="label" weight="semibold" tone="muted">How do reps go through it?</Text>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Course type">
              {(Object.keys(COURSE_TYPE) as (keyof typeof COURSE_TYPE)[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)}
                  className={cn("squircle flex flex-col gap-0.5 rounded-panel border p-3.5 text-left transition-colors", type === k ? "border-brand bg-tint" : "border-hair-2 bg-card hover:bg-subtle")}>
                  <span className="text-body-lg font-semibold text-ink">{COURSE_TYPE[k].label}</span>
                  <span className="text-caption text-ink-3">{COURSE_TYPE[k].hint}</span>
                  <span className="pt-1 text-caption text-ink-4">{COURSE_TYPE[k].useFor}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Text size="label" weight="semibold" tone="muted">Who is it written for?</Text>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Written for">
              {(Object.keys(WRITTEN_FOR) as (keyof typeof WRITTEN_FOR)[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={writtenFor === k} onClick={() => setWrittenFor(k)}
                  className={cn("squircle flex flex-col gap-0.5 rounded-panel border p-3.5 text-left transition-colors", writtenFor === k ? "border-brand bg-tint" : "border-hair-2 bg-card hover:bg-subtle")}>
                  <span className="text-body-lg font-semibold text-ink">{WRITTEN_FOR[k].label}</span>
                  <span className="text-caption text-ink-3">{WRITTEN_FOR[k].hint}</span>
                </button>
              ))}
            </div>
          </div>
          */}
          <div className="flex flex-col gap-2">
            <Text size="label" weight="semibold" tone="muted">Which field teams?</Text>
            <div className="flex flex-wrap gap-2">
              <Chip size="lg" selected={teams.length === 0} onClick={() => setTeams([])}>Everyone</Chip>
              {fieldTeams.map((d) => {
                const on = teams.includes(d.id);
                return <Chip key={d.id} size="lg" selected={on} onClick={() => setTeams(on ? teams.filter((x) => x !== d.id) : [...teams, d.id])}>{d.name} · {d.people} {writtenFor === "managers" ? "managers" : "reps"}</Chip>;
              })}
            </div>
            <Text size="caption" tone="subtle">
              {prod && teams.length === 1 && teams[0] === prod.divisionId ? `Matched to ${prod.brand}'s team. ` : ""}
              About {reach} {writtenFor === "managers" ? "managers" : "reps"}. You choose exactly who must take it, and by when, when you assign it after MLR approval.
            </Text>
          </div>
          <VisibilityPicker value={visibility} onChange={setVisibility} teams={teams.length ? teams.map((t) => DIVISIONS.find((d) => d.id === t)?.name).join(" and ") : "everyone"} />
        </Card>
      )}

      {step === 1 && (
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">What do you already have?</Text>
            <Text tone="subtle" size="body-lg">Add the materials you already have, and the source material SwishX should build the rest of the course from.</Text>
          </div>

          <section className="flex flex-col gap-3" aria-labelledby="in-course-h">
            <div className="flex flex-col gap-0.5">
              <Text as="h2" id="in-course-h" size="title" weight="bold">Put in the course{showItems.length ? <span className="font-semibold text-ink-3"> · {showItems.length}</span> : null}</Text>
              <Text size="body" tone="subtle">Ready-made materials reps see as they are. SwishX also analyses them to write questions and assessments.</Text>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {showItems.map((s) => <MaterialTile key={`c-${s.id}`} s={s} sub={howRepsGetIt(s)} place={placeOf(s)} onPlace={(p) => setPlaces({ ...places, [s.id]: p })} onPreview={() => setPreview(s)} onRemove={() => unpick(s)} />)}
              <Dropzone label="Add files reps should see" kinds="Video, audio, PDF, slides or images" onFiles={(files) => addFiles(files, "course")} />
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-hair pt-5" aria-labelledby="source-h">
            <div className="flex flex-col gap-0.5">
              <Text as="h2" id="source-h" size="title" weight="bold">Source material for SwishX<span className="font-semibold text-ink-3"> · {background.length}</span></Text>
              <Text size="body" tone="subtle">SwishX uses these to create the rest of the course: lessons, questions and media. Reps don&apos;t see them directly.</Text>
            </div>
            {!hasPI && <div className="squircle rounded-panel border border-danger-line bg-danger-bg px-4 py-3 text-body font-semibold text-danger">Add the Prescribing Information. SwishX needs it for any product course.</div>}
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {background.map((s) => {
                const pi = s.id === prod?.piSourceId;
                return <MaterialTile key={`s-${s.id}`} s={s} sub={pi ? "Always included for a product course" : `${s.uploaded ? FORMAT_LABEL[s.uploaded.format] : s.type}${s.pages ? ` · ${s.pages} pages` : ""}`} locked={pi}
                  place={placeOf(s)} onPlace={(p) => setPlaces({ ...places, [s.id]: p })} onPreview={() => setPreview(s)} onRemove={pi ? undefined : () => unpick(s)} />;
              })}
              <Dropzone label="Add your own source material" kinds="PDF, documents or data" onFiles={(files) => addFiles(files, "background")} />
            </div>
            {suggested.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <Text size="caption" weight="bold" tone="subtle">Add from your product library</Text>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {suggested.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSourceIds([...sourceIds, s.id])} aria-label={`Add ${s.title}`}
                      className="squircle flex items-center gap-2.5 rounded-panel border border-dashed border-hair-3 px-3 py-2.5 text-left transition-colors hover:border-brand hover:bg-tint">
                      <Plus className="size-4 shrink-0 text-brand-deep" aria-hidden="true" />
                      <span className="flex min-w-0 flex-col"><span className="line-clamp-2 text-body font-semibold leading-snug text-ink-2">{s.title}</span><span className="text-caption text-ink-3">{s.type} · {s.pages} pages</span></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <Text size="caption" tone="subtle" className="flex items-start gap-1.5 border-t border-hair pt-3">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />In one go: your ready-made materials go straight into the course, and SwishX uses the source material to create whatever else the course needs.
          </Text>
          {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
        </Card>
      )}

      {/* v1-hidden: Competencies as a step of its own. Now the top of the Outline step. */}
      {false && step === 2 && (
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Which competencies does this build?</Text>
            <Text tone="subtle" size="body-lg">SwishX picked these from your title and objective. Each one gets its own questions and screening score, and reports roll up by them.</Text>
          </div>
          <div className="flex flex-col gap-4">
            {Array.from(new Set(COMPETENCIES.map((c) => c.domain))).map((d) => (
              <div key={d} className="flex flex-col gap-2">
                <Text size="caption" weight="bold" tone="subtle">{domainOf(COMPETENCIES.find((c) => c.domain === d)!.id).name}</Text>
                <div className="flex flex-wrap gap-2">
                  {COMPETENCIES.filter((c) => c.domain === d).map((c) => (
                    <Chip key={c.id} size="lg" selected={comps.includes(c.id)} iconLeft={comps.includes(c.id) ? <AgentIcon className="size-3.5" aria-hidden="true" /> : undefined}
                      onClick={() => toggleComp(c.id)}>{c.name}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="squircle flex flex-col gap-1.5 rounded-panel bg-subtle px-4 py-3">
            <Text size="caption" weight="bold" tone="subtle">Why these</Text>
            {suggestions.map((x) => (
              <Text key={x.id} size="body" tone={comps.includes(x.id) ? "muted" : "subtle"} className={comps.includes(x.id) ? undefined : "line-through"}>
                <strong className="text-ink">{competency(x.id)?.name}</strong> · {x.why}
              </Text>
            ))}
            {compsTouched && <button type="button" onClick={() => { setComps(suggestions.map((x) => x.id)); setCompsTouched(false); }} className="self-start text-body font-semibold text-brand-deep hover:underline">Reset to suggestions</button>}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Check the outline before SwishX writes it</Text>
            <Text tone="subtle" size="body-lg">Reorder, rename or remove modules. Nothing is written until you generate.</Text>
          </div>
          <div className="squircle flex flex-col gap-2.5 rounded-panel bg-subtle px-4 py-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Text size="body-lg" weight="semibold">Competencies it builds</Text>
              <button type="button" onClick={() => setCompsOpen(!compsOpen)} className="text-body font-semibold text-brand-deep hover:underline">{compsOpen ? "Done" : "Change"}</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(compsOpen ? COMPETENCIES.map((c) => c.id) : comps).map((id) => (
                <Chip key={id} size="md" selected={comps.includes(id)} onClick={compsOpen ? () => toggleComp(id) : undefined}
                  title={suggestions.find((x) => x.id === id)?.why}>{competency(id)?.name}</Chip>
              ))}
              {!compsOpen && comps.length === 0 && <Text size="body" tone="danger">Pick at least one.</Text>}
            </div>
            <Text size="caption" tone="subtle">
              Picked from your title and objective. Each gets its own questions and screening score.
              {compsTouched && <> <button type="button" onClick={() => { setComps(suggestions.map((x) => x.id)); setCompsTouched(false); }} className="font-semibold text-brand-deep hover:underline">Reset to suggestions</button></>}
            </Text>
          </div>
          {!outline && !outlineLoading && (
            <Button size="lg" onClick={buildOutline} className="self-start"><AgentIcon className="size-4" aria-hidden="true" />Draft the outline</Button>
          )}
          {outlineLoading && (
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-[72px] rounded-panel border border-hair bg-subtle" />)}
              <Text size="body" tone="subtle" className="dot-cycle">Reading {learnIds.length} files and placing {showItems.length} of yours in the course<span>.</span><span>.</span><span>.</span></Text>
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
                      {yours[m.id]?.map((t) => <Chip key={t} size="xs" tone="brand">Yours · {t}</Chip>)}
                      {!yours[m.id] && <Chip size="xs" tone="ok">SwishX writes</Chip>}
                      <Chip size="xs">{competency(m.competency).name}</Chip>
                      <Chip size="xs">{form === "short" ? `${moduleCards(m).length} cards` : `${m.minutes} min`}</Chip>
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
          {outline && (() => {
            const mins = outline.reduce((a, m) => a + m.minutes, 0);
            return (
              <div className="flex flex-col gap-2">
                <Text size="body" tone="subtle">
                  {outline.length} modules · {form === "short" ? `${courseCardCount(outline)} cards, about ${Math.max(2, Math.round(courseCardCount(outline) * 0.35))} min` : `about ${mins} min`} · {showItems.length ? `${showItems.length} of your pieces placed, SwishX writes the rest` : "all written by SwishX"}
                </Text>
                {shapeNote.left.length > 0 && <Text size="caption" tone="subtle">Left out to keep it short: {shapeNote.left.join(", ")}.{/* v1-hidden: Add them to the Library if reps should still find them. */}</Text>}
                {shapeNote.added.length > 0 && <Text size="caption" tone="subtle">Added for depth, from the same sources: {shapeNote.added.join(", ")}.</Text>}
              </div>
            );
          })()}
        </Card>
      )}

      {step === 4 && outline && (
        <Card>
          <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Writing your course</Text>
          <Text tone="subtle" size="body-lg">{form === "short" ? "Breaking every module into cards, each one cited to a source page. Quick checks come next." : "Every sentence is cited to a source page. Questions and the roleplay rubric come next."}</Text>
          <ol className="flex flex-col gap-2">
            {outline.map((m, i) => (
              <li key={m.id} className={cn("squircle flex items-center gap-3 rounded-panel border p-3.5 transition-colors", i < genIndex ? "border-ok-line bg-ok-bg" : i === genIndex ? "shimmer border-tint-line bg-tint" : "border-hair bg-card")}>
                <span className={cn("grid size-7 place-items-center rounded-full", i < genIndex ? "bg-ok text-white" : "bg-black/[0.06] text-ink-3")}>
                  {i < genIndex ? <Check className="size-4" aria-hidden="true" /> : <span className="text-micro font-bold">{i + 1}</span>}
                </span>
                <Text size="body-lg" weight="semibold" className="flex-1">{m.title}</Text>
                <Text size="caption" tone="subtle">{i < genIndex ? (form === "short" ? `${moduleCards(m).length} cards · cited` : `${m.blocks.length} blocks · cited`) : i === genIndex ? "Writing…" : "Queued"}</Text>
              </li>
            ))}
            <li className={cn("squircle flex items-center gap-3 rounded-panel border p-3.5", genIndex >= outline.length ? "shimmer border-tint-line bg-tint" : "border-hair")}>
              <span className="grid size-7 place-items-center rounded-full bg-black/[0.06] text-micro font-bold text-ink-3">+</span>
              <Text size="body-lg" weight="semibold" className="flex-1">{form === "short" ? "Quick checks" : "Question bank and roleplay rubric"}</Text>
            </li>
          </ol>
        </Card>
      )}

      {step < 4 && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <div className="flex items-center gap-3 rounded-control bg-ink px-4 py-2.5 text-white shadow-float">
            <Text size="body" tone="inverse" className="hidden opacity-75 sm:inline">
              {step === 0 && "Next: add your materials"}
              {step === 1 && `${showItems.length} in the course · ${background.length} source material${background.length === 1 ? "" : "s"}`}
              {step === 2 && `${comps.length} competencies`}
              {step === 3 && (outline ? "Ready to write the course" : "Draft the outline first")}
            </Text>
            <Button disabled={!canNext} onClick={() => (step === 3 ? generate() : setStep(nextStep(step)))}>
              {step === 3 ? <><AgentIcon className="size-4" aria-hidden="true" />Generate course</> : <>Continue<ArrowRight className="size-4" aria-hidden="true" /></>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


const THUMB_TINT: Record<string, string> = {
  video: "bg-ink text-white", audio: "bg-ok-bg text-ok", image: "bg-info-bg text-info", slides: "bg-tint text-brand-deep", visualaid: "bg-tint text-brand-deep", pdf: "bg-subtle text-ink-3", doc: "bg-subtle text-ink-3", data: "bg-subtle text-ink-3",
};

/**
 * One file in the Materials step, shaped like a file card in Drive or Notion: a preview on top
 * (the real image or video frame when there is one), the name and how reps get it below, and
 * everything else (where it goes, preview, remove) in the ⋯ menu.
 */
function MaterialTile({ s, sub, place, onPlace, onPreview, onRemove, locked }: {
  s: Source; sub: string; place: Place; onPlace: (p: Place) => void; onPreview: () => void; onRemove?: () => void; locked?: boolean;
}) {
  /* The menu opens in a portal at the button's position, so the tile's rounded clipping can't cut it off. */
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  const fmt = s.uploaded?.format;
  const kind = fmt ?? (s.type === "Visual aid" ? "visualaid" : "pdf");
  const Icon = s.uploaded ? FORMAT_ICON[s.uploaded.format] : s.type === "Visual aid" ? FORMAT_ICON.slides : FileText;
  const url = s.uploaded ? fileUrl(s.id) : undefined;
  const typeLabel = fmt ? FORMAT_LABEL[fmt] : s.type === "Visual aid" ? "Slides" : "PDF";
  return (
    <div className="squircle group relative flex flex-col overflow-hidden rounded-panel border border-hair-2 bg-card transition-shadow hover:shadow-soft">
      <button type="button" onClick={onPreview} aria-label={`Preview ${s.title}`} className={cn("relative flex h-24 items-center justify-center overflow-hidden", THUMB_TINT[kind] ?? "bg-subtle text-ink-3")}>
        {url && fmt === "image" ? <img src={url} alt="" className="size-full object-cover" />
          : url && fmt === "video" ? <video src={url} muted preload="metadata" className="size-full object-cover" />
          : <Icon className="size-8 opacity-80" aria-hidden="true" />}
        <span className="absolute left-2 top-2 rounded-glyph bg-white/90 px-1.5 py-0.5 text-micro font-bold text-ink-2 shadow-hair">{typeLabel}{s.pages ? ` · ${s.pages}p` : ""}</span>
        {fmt === "video" && <span className="absolute grid size-9 place-items-center rounded-full bg-black/55 text-white"><Play className="size-4 translate-x-px" aria-hidden="true" /></span>}
      </button>
      <div className="flex items-start gap-2 p-3">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-body font-semibold leading-snug text-ink" title={s.title}>{s.title}</span>
          <span className="text-caption text-ink-3">{sub}</span>
          {place === "both" && <span className="pt-1"><Chip size="xs" tone="brand">In the course and source</Chip></span>}
          {locked && <span className="flex items-center gap-1 pt-1 text-caption text-ink-3"><Lock className="size-3" aria-hidden="true" />Required</span>}
        </span>
        <div className="relative -mr-1 shrink-0">
          <IconButton aria-label={`Options for ${s.title}`} aria-haspopup="menu" aria-expanded={!!menu}
            onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu(menu ? null : { top: r.bottom + 4, right: window.innerWidth - r.right }); }}><MoreVertical className="size-4" /></IconButton>
          {menu && (
            <Portal>
              <div className="fixed inset-0 z-[60]" onClick={() => setMenu(null)} aria-hidden="true" />
              <div role="menu" style={{ top: menu.top, right: menu.right }} className="select-pop fixed z-[61] w-[260px] rounded-panel border border-hair bg-card p-1.5 shadow-float">
                {!locked && (
                  <>
                    <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="block px-2.5 pb-1 pt-1">Use it as</Text>
                    {PLACE_OPTIONS.map((o) => (
                      <button key={o.id} type="button" role="menuitemradio" aria-checked={place === o.id} onClick={() => { onPlace(o.id); setMenu(null); }}
                        className={cn("flex w-full items-start gap-2.5 rounded-control px-2.5 py-2 text-left hover:bg-subtle", place === o.id && "bg-tint")}>
                        <Check className={cn("mt-0.5 size-4 shrink-0", place === o.id ? "text-brand-deep" : "invisible")} aria-hidden="true" />
                        <span className="flex flex-col"><span className="text-body font-semibold text-ink">{o.label}</span><span className="text-caption text-ink-3">{o.hint}</span></span>
                      </button>
                    ))}
                    <div className="my-1 border-t border-hair" />
                  </>
                )}
                <button type="button" role="menuitem" onClick={() => { onPreview(); setMenu(null); }} className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-body font-semibold text-ink-2 hover:bg-subtle"><Eye className="size-4" aria-hidden="true" />Preview</button>
                {onRemove && <button type="button" role="menuitem" onClick={() => { onRemove(); setMenu(null); }} className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-body font-semibold text-danger hover:bg-danger-bg"><Trash2 className="size-4" aria-hidden="true" />Remove</button>}
              </div>
            </Portal>
          )}
        </div>
      </div>
    </div>
  );
}

function Dropzone({ label, kinds, onFiles }: { label: string; kinds: string; onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
      className={cn("squircle flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-1 rounded-panel border border-dashed p-3 text-center transition-colors hover:border-brand hover:bg-tint", over ? "border-brand bg-tint" : "border-hair-3")}>
      <Upload className="size-5 text-brand-deep" aria-hidden="true" />
      <span className="text-body font-semibold text-ink-2">{label}</span>
      <span className="text-caption text-ink-3">{kinds}</span>
      <input type="file" className="sr-only" multiple onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </label>
  );
}
