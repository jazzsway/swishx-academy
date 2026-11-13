"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, Eye, FileText, ListChecks, Lock, PanelRight, PencilLine, Plus, Rocket, Settings2, Users, X } from "lucide-react";
import { AgentIcon, LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { product, source } from "@/data/org";
import type { Course, Scenario } from "@/data/types";
import { courseMinutes } from "@/lib/learning";
import { courseCardCount, moduleCards } from "@/lib/short-form";
import { draftScenario } from "@/lib/roleplay-draft";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { VersionChip } from "@/components/patterns/academy";
import { Portal } from "@/components/ui/portal";
import { RoleCopilot } from "@/features/copilot/copilot-panel";
import { useCopilot } from "@/features/copilot/copilot-store";
import { BLOCK_META } from "@/features/shared/block-view";
import { useCourse } from "./use-course";
import { questionCount } from "./question-index";
import { runChecks } from "./checks";

const PANEL_MIN = 320;
const PANEL_MAX = 560;
const initials = (name: string) => name.replace(/^Dr\.?\s*/, "").split(" ").map((x) => x[0]).join("").slice(0, 2);

/**
 * A course is its own workspace, like a project in the SwishX for Biz studios: a top bar with the
 * course's name and actions, the course down the left (its modules and its roleplays), the selected
 * piece in the middle, and the agent docked on the right. No app sidebar while you're in here.
 */
export function CourseFrame({ children }: { children: ReactNode }) {
  return <Suspense><Workspace>{children}</Workspace></Suspense>;
}

function Workspace({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const data = useCourse(id);
  const open = useCopilot((s) => s.open);
  const setOpen = useCopilot((s) => s.setOpen);
  const toggle = useCopilot((s) => s.toggle);
  const [width, setWidth] = useState(380);
  const [resizing, setResizing] = useState(false);

  /* The agent is part of the workspace, so it starts open. */
  useEffect(() => { setOpen(true); }, [setOpen]);
  useEffect(() => {
    try { const w = Number(localStorage.getItem("academy.agentWidth")); if (w >= PANEL_MIN && w <= PANEL_MAX) setWidth(w); } catch { /* storage off */ }
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && (e.key === "\\" || e.key.toLowerCase() === "j")) { e.preventDefault(); toggle(); } };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [toggle]);

  if (!data) return <div className="grid h-full place-items-center"><Text tone="subtle">Course not found. <Link href="/trainer/courses" className="text-brand-deep underline">Back to courses</Link></Text></div>;

  function startResize(e: React.PointerEvent) {
    const x0 = e.clientX, w0 = width;
    setResizing(true);
    const move = (ev: PointerEvent) => setWidth(Math.max(PANEL_MIN, Math.min(PANEL_MAX, w0 + (x0 - ev.clientX))));
    const up = () => {
      setResizing(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setWidth((w) => { try { localStorage.setItem("academy.agentWidth", String(w)); } catch { /* storage off */ } return w; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className={cn("flex h-dvh flex-col bg-canvas", resizing && "select-none")}>
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Rail course={data.course} editable={data.editable} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-subtle/60 [scrollbar-width:thin]" id="workspace-canvas">
          <div className="page-enter mx-auto flex w-full max-w-[980px] flex-col gap-4 px-5 py-6 lg:px-8">
            {!data.editable && (pathname === `/trainer/courses/${id}` || pathname.endsWith("/roleplay")) && (
              <div className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
                <Lock className="size-4 text-ink-3" aria-hidden="true" />
                <Text size="body" tone="muted" className="flex-1">v{data.cur.version} is live and locked. Editing creates v{data.cur.version + 1} as a draft; v{data.cur.version} stays live until you publish it.</Text>
              </div>
            )}
            {children}
          </div>
        </main>
        {open && (
          <aside aria-label="SwishX AI Agent" style={{ width }} className="copilot-in relative hidden shrink-0 flex-col border-l border-hair bg-card md:flex">
            <span onPointerDown={startResize} role="separator" aria-orientation="vertical" aria-label="Resize the agent panel"
              className={cn("absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize transition-colors hover:bg-brand/20", resizing && "bg-brand/30")} />
            <AgentDock course={data.course} />
          </aside>
        )}
      </div>
    </div>
  );
}

function TopBar() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id)!;
  const startNewVersion = useApp((s) => s.startNewVersion);
  const open = useCopilot((s) => s.open);
  const toggle = useCopilot((s) => s.toggle);
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  const { course, cur, lv } = data;
  const base = `/trainer/courses/${id}`;
  const direct = course.origin === "direct";
  const length = course.format === "short" ? `${courseCardCount(course.modules)} cards` : `${courseMinutes(course)} min`;
  const items = [
    { href: `${base}/settings`, label: "Settings", icon: Settings2 },
    { href: `${base}/people`, label: "People & progress", icon: Users },
    { href: `${base}/review`, label: "Publish & versions", icon: Rocket },
    ...(lv ? [{ href: `${base}/assign`, label: `Assign v${lv.version}`, icon: Users }] : []),
  ];
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hair bg-card px-3 sm:px-4">
      <Link href="/trainer/courses" aria-label="Back to courses" title="Courses" className="grid size-9 shrink-0 place-items-center rounded-control text-ink-3 transition-colors hover:bg-subtle hover:text-ink"><ArrowLeft className="size-4.5" /></Link>
      <span className="grid size-8 shrink-0 place-items-center rounded-control border border-tint-line bg-gradient-to-br from-tint to-white"><LogoMark size={17} className="text-brand" /></span>
      <span className="h-5 w-px shrink-0 bg-hair-2" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <Text as="h1" size="body-lg" weight="extrabold" truncate className="leading-tight">{course.title}</Text>
        <span className="hidden items-center gap-1.5 truncate text-micro font-semibold text-ink-3 sm:flex">
          v{cur.version} <VersionChip state={cur.state} size="xs" />
          {lv && lv.version !== cur.version && <span>· v{lv.version} live</span>}
          <span>· {product(course.productId)?.brand ?? "Company"} · {length}</span>
          <span className={cn("rounded-glyph px-1.5 py-px", direct ? "bg-info-bg text-info" : "bg-tint text-brand-deep")}>{direct ? "Direct from your materials" : "Created with SwishX"}</span>
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button type="button" aria-haspopup="menu" aria-expanded={!!menu}
          onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu(menu ? null : { top: r.bottom + 6, right: window.innerWidth - r.right }); }}
          className="hidden h-9 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-3 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle sm:flex">
          Course<ChevronDown className="size-4 text-ink-3" aria-hidden="true" />
        </button>
        <button type="button" onClick={toggle} aria-pressed={open} title={open ? "Hide the agent (⌘\\)" : "Show the agent (⌘\\)"} aria-label="Toggle the agent panel"
          className={cn("grid size-9 place-items-center rounded-control border transition-colors", open ? "border-hair-2 bg-black/5 text-ink" : "border-tint-line bg-tint text-brand-deep hover:bg-tint/70")}>
          {open ? <PanelRight className="size-4" /> : <AgentIcon className="size-4" />}
        </button>
        {cur.state === "published"
          ? <Button size="sm" variant="secondary" onClick={() => { startNewVersion(course.id); router.push(base); }}><PencilLine className="size-4" aria-hidden="true" />Edit as v{cur.version + 1}</Button>
          : <Button size="sm" variant="secondary" onClick={() => router.push(`${base}/preview`)}><Eye className="size-4" aria-hidden="true" />Preview as rep</Button>}
        <Button size="sm" onClick={() => router.push(cur.state === "published" ? `${base}/assign` : `${base}/review`)}>{cur.state === "published" ? "Assign" : "Publish"}</Button>
      </div>
      {menu && (
        <Portal>
          <div className="fixed inset-0 z-[60]" onClick={() => setMenu(null)} aria-hidden="true" />
          <div role="menu" style={{ top: menu.top, right: menu.right }} className="select-pop fixed z-[61] w-[240px] rounded-panel border border-hair bg-card p-1.5 shadow-float">
            {items.map((it) => (
              <Link key={it.href} role="menuitem" href={it.href} onClick={() => setMenu(null)} className="flex items-center gap-2.5 rounded-control px-2.5 py-2 text-body font-semibold text-ink-2 hover:bg-subtle">
                <it.icon className="size-4 text-ink-3" aria-hidden="true" />{it.label}
              </Link>
            ))}
          </div>
        </Portal>
      )}
    </header>
  );
}

/** The course down the left: its modules, then its roleplays, then the rest. */
function Rail({ course, editable }: { course: Course; editable: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const saveScenario = useApp((s) => s.saveScenario);
  const custom = useApp((s) => s.scenarios);
  const setDraft = useCopilot((s) => s.setDraft);
  const setOpen = useCopilot((s) => s.setOpen);
  const base = `/trainer/courses/${course.id}`;
  const onContent = pathname === base;
  const onRoleplay = pathname.startsWith(`${base}/roleplay`);
  const moduleId = search.get("module") ?? course.modules[0]?.id;
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const scId = search.get("sc") ?? scs[0]?.id;
  const issues = useMemo(() => runChecks(course).filter((f) => f.severity !== "green"), [course]);
  const direct = course.origin === "direct";
  const nQuestions = questionCount(course);
  const active = useRef<HTMLAnchorElement>(null);
  useEffect(() => { active.current?.scrollIntoView({ block: "nearest" }); }, [moduleId]);
  /* A long module list folds away while you work on something else, so the roleplays stay in reach. */
  const [modsOpen, setModsOpen] = useState<boolean | null>(null);
  const showMods = modsOpen ?? (onContent || course.modules.length <= 6);

  function addRoleplay() {
    const docs = (course.roleplaySourceIds?.length ? course.roleplaySourceIds : course.sourceIds).map((x) => source(x)).filter((x): x is NonNullable<typeof x> => !!x);
    const sc = draftScenario({ courseId: course.id, productId: course.productId, sources: docs });
    saveScenario(sc, { practice: true, final: false });
    router.push(`${base}/roleplay?sc=${sc.id}`);
  }

  const section = (label: string, extra?: ReactNode) => (
    <div className="flex items-center justify-between px-2 pb-1 pt-3">
      <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider">{label}</Text>{extra}
    </div>
  );
  const link = (href: string, on: boolean, icon: ReactNode, label: string, sub?: string, badge?: ReactNode) => (
    <Link href={href} ref={on ? active : undefined} aria-current={on ? "page" : undefined}
      className={cn("squircle group flex items-center gap-2.5 rounded-control px-2 py-1.5 transition-colors", on ? "bg-tint" : "hover:bg-subtle")}>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-body font-semibold leading-snug", on ? "text-ink" : "text-ink-2")}>{label}</span>
        {sub && <span className="truncate text-micro text-ink-3">{sub}</span>}
      </span>
      {badge}
    </Link>
  );

  return (
    <nav aria-label="Course" className="hidden w-[256px] shrink-0 flex-col overflow-y-auto border-r border-hair bg-canvas px-2.5 pb-4 [scrollbar-width:thin] md:flex">
      <JourneyStrip course={course} editable={editable} />
      {section(`${course.modules.length} module${course.modules.length === 1 ? "" : "s"}`,
        <button type="button" onClick={() => setModsOpen(!showMods)} aria-expanded={showMods} aria-label={showMods ? "Fold the modules" : "Show the modules"} className="grid size-5 place-items-center rounded-glyph text-ink-3 hover:bg-subtle hover:text-ink">
          <ChevronDown className={cn("size-3.5 transition-transform", !showMods && "-rotate-90")} aria-hidden="true" />
        </button>)}
      <div className={cn("flex-col gap-0.5", showMods ? "flex" : "hidden")}>
        {course.modules.map((m, i) => {
          const on = onContent && m.id === moduleId;
          const b = m.blocks.find((x) => x.type !== "check");
          const n = issues.filter((f) => f.moduleId === m.id).length;
          const Icon = b ? BLOCK_META[b.type].icon : FileText;
          return (
            <div key={m.id}>
              {link(`${base}?module=${m.id}`, on,
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-glyph text-micro font-bold", on ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>{i + 1}</span>,
                m.title,
                course.format === "short" ? `${moduleCards(m).length} cards` : direct ? `${BLOCK_META[b?.type ?? "file"].label === "Your file" ? "Your file" : BLOCK_META[b?.type ?? "file"].label} · ${m.minutes} min` : `${m.minutes} min · ${m.blocks.length} blocks`,
                n > 0 ? <span className="rounded-glyph bg-danger-bg px-1.5 text-micro font-bold text-danger">{n}</span> : direct ? <Icon className="size-3.5 shrink-0 text-ink-4" aria-hidden="true" /> : undefined)}
            </div>
          );
        })}
        {editable && (
          <button type="button" onClick={() => { setOpen(true); setDraft(direct ? "Add a file as a new module: " : "Add a module on "); router.push(base); }}
            className="flex items-center gap-2 rounded-control px-2 py-1.5 text-body font-semibold text-brand-deep transition-colors hover:bg-tint">
            <Plus className="size-4" aria-hidden="true" />{direct ? "Add material" : "Add a module"}
          </button>
        )}
      </div>

      {section("AI roleplay", scs.length > 0 ? <Text size="micro" tone="subtle" tabular>{scs.length}</Text> : undefined)}
      <div className="flex flex-col gap-0.5">
        {scs.map((sc: Scenario) => {
          const on = onRoleplay && sc.id === scId;
          const final = course.settings.assessmentScenarioId === sc.id;
          return (
            <div key={sc.id}>
              {link(`${base}/roleplay?sc=${sc.id}`, on,
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white", on ? "bg-brand" : "bg-gradient-to-br from-brand-2 to-brand")}>{initials(sc.persona.name)}</span>,
                sc.persona.name,
                [course.settings.screeningScenarioId === sc.id || sc.use.includes("screening") ? "Screening call" : "", sc.use.includes("practice") && "Practice", final && "Final call"].filter(Boolean).join(" · ") || "Not in use",
                !sc.custom ? <Lock className="size-3 shrink-0 text-ink-4" aria-label="Approved package, read only" /> : undefined)}
            </div>
          );
        })}
        {scs.length === 0 && <Text size="caption" tone="subtle" className="px-2 py-1">No roleplay yet.</Text>}
        {editable && (
          <button type="button" onClick={addRoleplay} className="flex items-center gap-2 rounded-control px-2 py-1.5 text-body font-semibold text-brand-deep transition-colors hover:bg-tint">
            <Plus className="size-4" aria-hidden="true" />Add a roleplay
          </button>
        )}
      </div>

      {(!direct || nQuestions > 0) && (
        <>
          {section("Assessment")}
          {link(`${base}/questions`, pathname.startsWith(`${base}/questions`), <span className="grid size-6 shrink-0 place-items-center rounded-glyph bg-black/[0.06] text-ink-3"><ListChecks className="size-3.5" aria-hidden="true" /></span>,
            "Questions", `${nQuestions} in the bank`)}
        </>
      )}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-hair pt-2">
        {[
          { href: `${base}/settings`, label: "Settings", icon: Settings2 },
          { href: `${base}/people`, label: "People & progress", icon: Users },
          { href: `${base}/review`, label: "Publish & versions", icon: Rocket },
        ].map((it) => (
          <Link key={it.href} href={it.href} aria-current={pathname.startsWith(it.href) ? "page" : undefined}
            className={cn("flex items-center gap-2.5 rounded-control px-2 py-1.5 text-body font-semibold transition-colors", pathname.startsWith(it.href) ? "bg-tint text-ink" : "text-ink-3 hover:bg-subtle hover:text-ink")}>
            <it.icon className="size-4" aria-hidden="true" />{it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** The docked agent: the page's own editing chat when it has one, the trainer's agent otherwise; plus the course's checks. */
function AgentDock({ course }: { course: Course }) {
  const setSlot = useCopilot((s) => s.setSlot);
  const overridden = useCopilot((s) => s.overrides > 0);
  const setOpen = useCopilot((s) => s.setOpen);
  const [tab, setTab] = useState<"agent" | "checks">("agent");
  const issues = useMemo(() => runChecks(course).filter((f) => f.severity !== "green"), [course]);
  const base = `/trainer/courses/${course.id}`;
  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-hair px-2.5">
        {(["agent", "checks"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t}
            className={cn("flex h-8 items-center gap-1.5 rounded-control px-2.5 text-body font-semibold transition-colors", tab === t ? "bg-subtle text-ink" : "text-ink-3 hover:text-ink")}>
            {t === "agent" ? <><AgentIcon className="size-3.5 text-brand" aria-hidden="true" />Agent</> : <>Checks{issues.length > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-danger px-1 text-micro font-bold text-white">{issues.length}</span>}</>}
          </button>
        ))}
        <button type="button" onClick={() => setOpen(false)} aria-label="Hide the agent" className="ml-auto grid size-8 place-items-center rounded-control text-ink-3 hover:bg-subtle hover:text-ink"><X className="size-4" /></button>
      </div>
      <div className={cn("min-h-0 flex-1 flex-col", tab === "agent" ? "flex" : "hidden")}>
        <div ref={setSlot} className={cn("min-h-0 flex-1 flex-col", overridden ? "flex" : "hidden")} />
        {!overridden && <RoleCopilot role="trainer" onGo={() => undefined} />}
      </div>
      {tab === "checks" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {issues.length === 0 && (
            <div className="squircle flex flex-col items-center gap-1 rounded-panel bg-ok-bg px-4 py-6 text-center">
              <Text size="body-lg" weight="bold" tone="ok">Nothing to fix</Text>
              <Text size="caption" tone="subtle">{course.origin === "direct" ? "Your files go in as they are, so there's no generated text to check." : "Every sentence is cited and on-label."}</Text>
            </div>
          )}
          {issues.map((f) => (
            <Link key={f.id} href={f.moduleId ? `${base}?module=${f.moduleId}` : base} className="squircle flex items-start gap-2.5 rounded-panel border border-hair p-3 transition-colors hover:bg-subtle">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", f.severity === "red" ? "bg-danger" : "bg-warn")} />
              <span className="flex min-w-0 flex-col gap-0.5"><span className="text-body font-semibold text-ink">{f.title}</span><span className="text-caption text-ink-3">{f.detail}</span></span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * The rep's journey through this course, as the trainer sets it: screening, the content, practice,
 * the final call, the certificate. The same steps reps see, switched on or off here.
 */
function JourneyStrip({ course, editable }: { course: Course; editable: boolean }) {
  const updateSettings = useApp((s) => s.updateSettings);
  const saveScenario = useApp((s) => s.saveScenario);
  useApp((s) => s.scenarios);
  const st = course.settings;
  const short = course.format === "short";
  const sc = allScenarios().find((x) => x.id === (st.assessmentScenarioId ?? st.screeningScenarioId ?? course.scenarioIds[0]));
  const hasQuestions = course.items.some((i) => i.pool === "screening");
  const canScreen = !short && (hasQuestions || !!sc);
  const unit = course.origin === "direct" ? "file" : "module";
  const required = course.modules.filter((m) => m.required).length;
  const doctor = sc?.persona.name.replace(/^Dr\.?\s*/, "Dr. ") ?? "";
  const rows: { key: string; label: string; sub: string; on: boolean; can: boolean; set?: (v: boolean) => void; fixed?: boolean }[] = [
    { key: "screen", label: "Screening", sub: !canScreen ? (short ? "Not for short form" : "Needs a roleplay or questions") : st.screening ? [hasQuestions && "Quiz", st.screeningCall && sc && `call with ${doctor}`].filter(Boolean).join(" + ") || "On" : "Everyone takes everything",
      on: canScreen && st.screening, can: canScreen,
      set: (v) => updateSettings(course.id, v ? { screening: true, screeningCall: !!sc, screeningScenarioId: st.screeningScenarioId ?? sc?.id, baseline: true } : { screening: false, screeningCall: false }) },
    { key: "content", label: course.format === "short" ? "Cards" : `${course.modules.length} ${unit}${course.modules.length === 1 ? "" : "s"}`, sub: required ? `${required} for everyone` : "In order", on: true, can: false, fixed: true },
    { key: "practice", label: "Practice", sub: sc ? `With ${doctor}, private` : "Add a roleplay", on: !!sc?.use.includes("practice"), can: !!sc,
      set: (v) => sc && saveScenario(sc, { practice: v, final: st.assessmentScenarioId === sc.id }) },
    { key: "final", label: "Final call", sub: sc ? `Pass ${st.passRoleplay} · ${st.attempts} attempts` : "Add a roleplay", on: !!sc && st.assessmentScenarioId === sc.id, can: !!sc,
      set: (v) => sc && saveScenario(sc, { practice: sc.use.includes("practice"), final: v }) },
    { key: "cert", label: "Certificate", sub: st.completion.attestation ? "Signed attestation" : "On completion", on: true, can: false, fixed: true },
  ];
  return (
    <section aria-label="Rep journey" className="mt-3 rounded-panel border border-hair bg-card p-2.5">
      <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="block px-1 pb-1.5">Rep journey</Text>
      <ol className="flex flex-col">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center gap-2.5 px-1 py-1">
            <span className="flex flex-col items-center self-stretch">
              <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", r.on ? "bg-brand" : "border border-hair-3 bg-card")} />
              {i < rows.length - 1 && <span className={cn("mt-0.5 w-px flex-1", r.on ? "bg-brand/40" : "bg-hair-2")} />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col pb-0.5">
              <span className={cn("truncate text-caption font-semibold", r.on ? "text-ink" : "text-ink-3")}>{r.label}</span>
              <span className="truncate text-micro text-ink-3">{r.sub}</span>
            </span>
            {!r.fixed && (
              <button type="button" role="switch" aria-checked={r.on} aria-label={r.label} disabled={!editable || !r.can} onClick={() => r.set?.(!r.on)}
                className={cn("relative h-4.5 w-8 shrink-0 rounded-full transition-colors disabled:opacity-40", r.on ? "bg-ok" : "bg-hair-3")}>
                <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-white shadow-hair transition-all", r.on ? "left-[15px]" : "left-0.5")} />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
