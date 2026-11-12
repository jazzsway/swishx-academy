import type { Block, Citation, Module, ShortTemplate } from "@/data/types";
import { DOC_PAGES, VA_PAGES } from "@/data/media";

/**
 * Short form: the same approved content as a long course, broken into one-idea cards a rep swipes
 * through. Nothing new is written, so nothing new needs MLR: every card is a slice of a block.
 */

export type CardRole = "idea" | "point" | "flip" | "media" | "check";

export type ShortCard =
  | { id: string; blockId: string; role: "idea" | "point"; title?: string; body: string; stat?: string; say?: string; avoid?: string; cite?: Citation }
  | { id: string; blockId: string; role: "flip"; front: string; back: string }
  | { id: string; blockId: string; role: "media"; block: Block }
  | { id: string; blockId: string; role: "check"; question: string; options: string[]; answer: number; rationale: string };

export interface TemplateSpec {
  label: string;
  hint: string;
  /** What reps see above each kind of card. */
  eyebrow: Record<CardRole, string>;
  /** The glow on the module cover, a theme colour. */
  accent: string;
  /** Readable text in the same hue, for labels on white. */
  ink: string;
  /** The kind of course it suits, shown when picking. */
  bestFor: string;
  /** Example cards for the picker and the sample preview. */
  sample: { title: string; cards: { role: CardRole; title?: string; body: string; say?: string; options?: string[]; answer?: number }[] };
}

export const TEMPLATES: Record<ShortTemplate, TemplateSpec> = {
  essentials: {
    label: "Essentials", hint: "Must-know rules and basics, one per card.", accent: "var(--color-info-strong)", ink: "var(--color-info)", bestFor: "Compliance, policies, how-tos",
    eyebrow: { idea: "Know this", point: "Remember", flip: "Quick recall", media: "See it", check: "Check yourself" },
    sample: { title: "Reporting adverse events", cards: [
      { role: "idea", title: "Any mention counts", body: "If an HCP or patient mentions a possible side effect, it's an adverse event, even if they don't think the product caused it." },
      { role: "point", body: "Report it within 24 hours, through the safety line or the AE form in your CRM." },
      { role: "idea", title: "You don't judge it", body: "Causality is for Pharmacovigilance. Your job is to pass on what you heard, word for word." },
      { role: "check", body: "A nurse mentions a patient's rash after the first dose. What do you do?", options: ["Report it within 24 hours", "Wait to see if it recurs", "Ask the HCP if it's related"], answer: 0 },
    ] },
  },
  glance: {
    label: "Product at a glance", hint: "The product in a few swipes: who it's for, the data, dosing, safety.", accent: "var(--color-brand)", ink: "var(--color-brand-deep)", bestFor: "Launches and product refreshers",
    eyebrow: { idea: "Key fact", point: "Remember", flip: "Recall", media: "See it", check: "Quick check" },
    sample: { title: "Lumora at a glance", cards: [
      { role: "idea", title: "Who it's for", body: "Adults with moderate-to-severe atopic dermatitis not controlled on topical prescription therapies." },
      { role: "point", title: "EASI-75 at week 16", body: "51% vs 17% placebo, LUMEN-1 and LUMEN-2 pooled." },
      { role: "idea", title: "Dosing", body: "500 mg loading dose at week 0, then 250 mg every 2 weeks through week 16." },
      { role: "check", body: "What's the loading dose?", options: ["500 mg", "250 mg", "750 mg"], answer: 0 },
    ] },
  },
  objection: {
    label: "Objection handler", hint: "What you'll hear, what's behind it, and what to say.", accent: "var(--color-accent-violet)", ink: "var(--color-accent-violet)", bestFor: "Access, cost and field pushback",
    eyebrow: { idea: "What's behind it", point: "Say this", flip: "They say · You say", media: "Show this", check: "Your move" },
    sample: { title: "\"It's too expensive\"", cards: [
      { role: "idea", title: "What you'll hear", body: "\"My patients can't afford another biologic.\" It's usually about prior auth and out-of-pocket cost, not price." },
      { role: "point", body: "Acknowledge it, then move to access.", say: "Let's look at what your patient would actually pay. The Access Hub checks coverage before the first dose." },
      { role: "idea", title: "Don't promise", body: "Never promise coverage or a copay amount. Offer the Hub's benefits check instead." },
      { role: "check", body: "Which reply stays compliant?", options: ["The Hub will check their coverage", "Insurance always covers it", "It's free with the copay card"], answer: 0 },
    ] },
  },
  label: {
    label: "Label update", hint: "What changed, why it matters, what to say now.", accent: "var(--color-warn-on-dark)", ink: "var(--color-warn)", bestFor: "Label and safety changes",
    eyebrow: { idea: "What changed", point: "Say it now", flip: "Before · After", media: "On the label", check: "Got it?" },
    sample: { title: "Cardexa October 2026 label", cards: [
      { role: "idea", title: "New contraindication", body: "Don't start Cardexa if eGFR is below 20. It was below 15 in the old label." },
      { role: "point", body: "Lead with the change when an HCP asks what's new.", say: "The updated label adds an eGFR threshold of 20 for starting therapy." },
      { role: "idea", title: "Safety wording", body: "Hypotension risk now names high-dose diuretics, exactly as in section 5.2." },
      { role: "check", body: "Below which eGFR shouldn't Cardexa be started?", options: ["20", "15", "30"], answer: 0 },
    ] },
  },
  myth: {
    label: "Myth vs fact", hint: "Common misconceptions, each answered with the source.", accent: "var(--color-ok-on-dark)", ink: "var(--color-ok)", bestFor: "Disease and category education",
    eyebrow: { idea: "The facts", point: "Fact", flip: "Myth or fact?", media: "See it", check: "Myth or fact?" },
    sample: { title: "Atopic dermatitis myths", cards: [
      { role: "idea", title: "Myth: it's just dry skin", body: "Fact: AD is a chronic, type 2 inflammatory disease. Dry skin is a symptom, not the cause." },
      { role: "point", body: "Itch is the most burdensome symptom. Ask about sleep." },
      { role: "idea", title: "Myth: kids grow out of it", body: "Fact: many don't. Adult-onset and persistent AD are common." },
      { role: "check", body: "AD is contagious.", options: ["Myth", "Fact"], answer: 0 },
    ] },
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as ShortTemplate[];

/** A sensible default template for a course, from its title. */
export function templateFor(title: string): ShortTemplate {
  const t = title.toLowerCase();
  if (/objection|cost|access|pushback/.test(t)) return "objection";
  if (/label|update|change/.test(t)) return "label";
  if (/myth|101|basics|disease/.test(t)) return "myth";
  if (/compliance|policy|rules|safety/.test(t)) return "essentials";
  return "glance";
}

const LIMIT = 170;

/** Splits text into card-sized pieces on sentence boundaries. */
export function chunk(text: string, limit = LIMIT): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["”)]?\s*|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && (cur + " " + s).length > limit) { out.push(cur); cur = s; } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

/** One block as cards. */
export function blockCards(b: Block): ShortCard[] {
  const id = (k: string | number) => `${b.id}~${k}`;
  const out: ShortCard[] = [];
  switch (b.type) {
    case "lesson":
      (b.paragraphs ?? []).forEach((p, i) => chunk(p.text).forEach((body, j) => out.push({ id: id(`${i}.${j}`), blockId: b.id, role: "idea", title: i === 0 && j === 0 ? b.title : undefined, body, cite: p.cite })));
      break;
    case "keypoints":
      (b.points ?? []).forEach((p, i) => out.push({ id: id(i), blockId: b.id, role: "point", body: p.text, cite: p.cite }));
      break;
    case "flashcards":
      (b.cards ?? []).forEach((c, i) => out.push({ id: id(i), blockId: b.id, role: "flip", front: c.front, back: c.back }));
      break;
    case "check":
      if (b.check) out.push({ id: id("q"), blockId: b.id, role: "check", ...b.check });
      break;
    case "document": {
      const pages = DOC_PAGES[b.document?.sourceId ?? ""] ?? {};
      for (const n of b.document?.pages ?? []) {
        const pg = pages[n];
        if (!pg) continue;
        pg.sections.forEach((sec, i) => chunk(sec.p).forEach((body, j) => out.push({ id: id(`${n}.${i}.${j}`), blockId: b.id, role: "idea", title: j === 0 ? sec.h ?? pg.title : undefined, body, cite: { sourceId: b.document!.sourceId, page: n } })));
      }
      if (!out.length) out.push({ id: id("m"), blockId: b.id, role: "media", block: b });
      break;
    }
    case "visualaid": {
      const pages = VA_PAGES[b.visualaid?.sourceId ?? ""] ?? {};
      for (const pg of b.visualaid?.pages ?? []) {
        const va = pages[pg.page];
        out.push({ id: id(pg.page), blockId: b.id, role: "point", title: va?.headline ?? `Page ${pg.page}`, body: va?.sub ?? "", stat: va?.stat, say: pg.say, avoid: pg.avoid, cite: { sourceId: b.visualaid!.sourceId, page: pg.page } });
      }
      break;
    }
    case "video": {
      const v = b.video;
      /* The approved script, chapter by chapter. A YouTube video has no script of ours, so it plays as is. */
      if (v && v.origin !== "youtube" && v.captions.length) {
        const chapters = v.chapters.length ? v.chapters : [{ at: 0, title: b.title }];
        chapters.forEach((ch, i) => {
          const end = chapters[i + 1]?.at ?? Infinity;
          const text = v.captions.filter((c) => c.at >= ch.at && c.at < end).map((c) => c.text).join(" ");
          const scene = [...v.scenes].reverse().find((sc) => sc.at <= ch.at) ?? v.scenes[0];
          chunk(text).forEach((body, j) => out.push({ id: id(`${i}.${j}`), blockId: b.id, role: "idea", title: j === 0 ? ch.title : undefined, body, stat: j === 0 ? scene?.stat : undefined }));
          if (ch.check) out.push({ id: id(`${i}.q`), blockId: b.id, role: "check", ...ch.check });
        });
      } else out.push({ id: id("m"), blockId: b.id, role: "media", block: b });
      break;
    }
    case "graphic": {
      const g = b.graphic;
      if (g) {
        out.push({ id: id("h"), blockId: b.id, role: "idea", title: g.headline, body: g.stats.map((x) => `${x.value} ${x.label}`).join(" · "), stat: g.stats[0]?.value });
        g.points.forEach((p, i) => out.push({ id: id(i), blockId: b.id, role: "point", body: p }));
      }
      break;
    }
    case "scenario":
      break;
    default:
      out.push({ id: id("m"), blockId: b.id, role: "media", block: b });
  }
  return out;
}

/** A module as cards: everything to learn first, then its questions. */
export function moduleCards(m: Module): ShortCard[] {
  const all = m.blocks.flatMap(blockCards);
  return [...all.filter((c) => c.role !== "check"), ...all.filter((c) => c.role === "check")];
}

export const courseCardCount = (mods: Module[]) => mods.reduce((a, m) => a + moduleCards(m).length, 0);
