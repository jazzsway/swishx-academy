"use client";

import type { Course, Module, Progress, User } from "@/data/types";
import type { AppState } from "@/store/app-store";
import { current, live } from "@/store/app-store";
import { counts, daysFromToday, fmtDate, heatmap, isOverdue, pct, STATE_LABEL, weakestDomains } from "@/store/selectors";
import { competency, PRODUCTS, source } from "@/data/org";
import { OBJECTIONS, prohibited } from "@/data/scenarios";
import { runChecks } from "@/features/trainer/course/checks";
import { COMPARATIVE_HINTS, OFF_LABEL_HINTS } from "@/features/library/library-data";
import { modulesOf, nextBlock, nextStepFor, pathProgress } from "@/features/rep/use-rep";

/*
 * The copilot's brains. Deterministic and local: every answer is computed
 * from Academy data or quoted from approved course content, never generated.
 */

export type Role = "trainer" | "manager" | "rep";
export type Tone = "danger" | "warn" | "ok" | "faint";

export interface CoItem { title: string; sub?: string; href?: string; tone?: Tone }
export interface CoAction { label: string; href?: string; run?: () => string }
export interface CoReply { text: string; items?: CoItem[]; actions?: CoAction[] }
export interface Briefing { title: string; text: string; items: CoItem[] }

export interface Ctx {
  s: AppState;
  me: User;
  path: string;
  search: URLSearchParams;
}

const has = (p: string, ...words: (string | RegExp)[]) =>
  words.some((w) => (typeof w === "string" ? p.includes(w) : w.test(p)));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const courseOf = (s: AppState, id?: string) => s.courses.find((c) => c.id === id);
const userOf = (s: AppState, id?: string) => s.users.find((u) => u.id === id);

/** /trainer/courses/:id, /rep/course/:id → the course the page is about. */
function pageCourse({ s, path }: Ctx) {
  const m = path.match(/^\/(?:trainer\/courses|rep\/course)\/([^/?#]+)/);
  return m && m[1] !== "new" ? courseOf(s, m[1]) : undefined;
}

/* ───────────────────────── Trainer ───────────────────────── */

function trainerQueue(s: AppState): CoItem[] {
  const out: CoItem[] = [];
  for (const c of s.courses) {
    const v = current(c);
    if (v.state === "changes") out.push({ tone: "danger", title: `Fix MLR comments · ${c.title}`, sub: plural(v.comments.filter((m) => !m.resolved).length, "open comment"), href: `/trainer/courses/${c.id}/review` });
    if (v.state === "approved") out.push({ tone: "warn", title: `Publish ${c.title} v${v.version}`, sub: `Approved · ${v.docNumber}`, href: `/trainer/courses/${c.id}/review` });
    const lv = live(c);
    if (lv?.expiresAt && daysFromToday(lv.expiresAt) <= 30) out.push({ tone: "warn", title: `Approval expires in ${daysFromToday(lv.expiresAt)} days · ${c.title}`, sub: lv.docNumber, href: `/trainer/courses/${c.id}/review` });
  }
  const slow = s.progress.filter((p) => p.state === "awaiting_verify" && p.verify && -daysFromToday(p.verify.requestedAt) > 5);
  if (slow.length) out.push({ tone: "warn", title: `${plural(slow.length, "verification")} waiting over 5 days`, sub: "You can verify on the manager's behalf", href: "/trainer/verify" });
  const overdue = s.progress.filter(isOverdue);
  if (overdue.length) out.push({ tone: "warn", title: `${plural(overdue.length, "rep")} overdue`, sub: "Ask me to nudge them", href: "/trainer/records" });
  return out;
}

function nudgeAll(s: AppState, ps: Progress[], by: string): CoAction {
  return {
    label: `Nudge all ${ps.length}`,
    run: () => {
      let n = 0;
      for (const p of ps) if (s.nudge(p.id, by)) n++;
      return n ? `Nudged ${plural(n, "rep")}.${n < ps.length ? ` ${ps.length - n} were nudged in the last 48 hours, so I skipped them.` : ""}` : "All of them were nudged in the last 48 hours already.";
    },
  };
}

function courseHealth(c: Course): CoReply {
  const v = current(c);
  const f = runChecks(c);
  const red = f.filter((x) => x.severity === "red").length;
  /* Question coverage gets its own line below, so warnings here are about wording and media. */
  const warnings = f.filter((x) => x.severity === "orange" && !x.id.startsWith("cov-"));
  const orange = warnings.length;
  const thin = c.competencyIds.filter((id) => c.items.filter((i) => i.competency === id).length < 6);
  const next: Record<string, string> = {
    draft: red ? "Fix the red findings, then mark it ready for MLR." : "Checks are clean. Mark it ready and build the MLR package.",
    ready: "It's ready. Submit the package to MLR and record the date.",
    in_review: "It's with MLR. Record the decision when it comes back.",
    changes: "MLR asked for changes. Work through the open comments.",
    approved: "Approved. Publish it and choose how certified reps transition.",
    published: "Live. Assign it, or start a new version to change it.",
  };
  return {
    text: `${c.title} v${v.version} is ${v.state.replace("_", " ")}. ${next[v.state] ?? ""}`,
    items: [
      { tone: red ? "danger" : "ok", title: red ? `${plural(red, "blocking finding")}` : "No blocking findings", sub: red ? "Uncited or off-indication sentences" : "Every sentence is cited" },
      ...(orange ? [{ tone: "warn" as Tone, title: `${plural(orange, "warning")}`, sub: [...new Set(warnings.map((w) => w.title))].slice(0, 2).join(" · ") }] : []),
      ...(thin.length ? [{ tone: "warn" as Tone, title: `Thin question bank on ${thin.slice(0, 3).map((id) => competency(id)?.name.toLowerCase()).join(", ")}${thin.length > 3 ? ` and ${thin.length - 3} more` : ""}`, sub: "Fewer than 6 questions each" }] : []),
    ],
    actions: [{ label: "Open review", href: `/trainer/courses/${c.id}/review` }],
  };
}

function courseRollout(s: AppState, c: Course): CoReply {
  const ps = s.progress.filter((p) => p.courseId === c.id);
  if (!ps.length) return { text: `Nobody is assigned to ${c.title} yet.`, actions: live(c) ? [{ label: "Assign it", href: `/trainer/courses/${c.id}/assign` }] : [] };
  const k = counts(ps);
  const overdue = ps.filter(isOverdue);
  return {
    text: `${plural(k.total, "rep")} assigned. ${pct(k.certified, k.total)}% certified, ${k.in_progress} in progress, ${k.not_started} not started.`,
    items: overdue.length ? [{ tone: "warn", title: `${plural(overdue.length, "rep")} overdue`, sub: `${overdue.filter((p) => p.state === "not_started").length} haven't started` }] : [],
    actions: overdue.length ? [nudgeAll(s, overdue, "u-maya")] : [],
  };
}

export const trainerBrain = {
  scope: "Uses only your approved sources and Academy data. Changes always wait for your OK.",
  briefing(ctx: Ctx): Briefing {
    const c = pageCourse(ctx);
    if (c) {
      const h = courseHealth(c);
      return { title: c.title, text: h.text, items: h.items ?? [] };
    }
    const q = trainerQueue(ctx.s);
    return { title: `Good morning, ${ctx.me.first}`, text: q.length ? `${plural(q.length, "thing")} need${q.length === 1 ? "s" : ""} you today.` : "Nothing is waiting on you.", items: q.slice(0, 5) };
  },
  prompts(ctx: Ctx) {
    if (pageCourse(ctx)) return ["Is this ready for MLR?", "Where is the question bank thin?", "How is the rollout going?"];
    return ["Who's overdue?", "Where are reps weakest?", "What's expiring soon?", "Build a course for Arthelis"];
  },
  answer(prompt: string, ctx: Ctx): CoReply {
    const p = prompt.toLowerCase();
    const { s } = ctx;
    const c = pageCourse(ctx);

    const brand = PRODUCTS.find((x) => p.includes(x.brand.toLowerCase()));
    if (has(p, "build", "create", "new course", "draft a", "make a course")) {
      return {
        text: brand
          ? `I'll start the course builder on ${brand.brand}. It drafts only from ${brand.brand}'s Prescribing Information and the sources you tick, and cites every sentence by page.`
          : "Tell me the product, or start the builder and pick it there. I draft only from the sources you tick, and cite every sentence by page.",
        actions: [{ label: brand ? `Start the ${brand.brand} course` : "Open the course builder", href: `/trainer/courses/new${brand ? `?product=${brand.id}` : ""}` }],
      };
    }
    if (c && has(p, "mlr", "ready", "check", "issue", "finding")) return courseHealth(c);
    if (c && has(p, "question", "bank", "item")) {
      const rows = c.competencyIds.map((id) => ({ id, n: c.items.filter((i) => i.competency === id).length })).sort((a, b) => a.n - b.n);
      return {
        text: `${plural(c.items.length, "question")} across ${plural(c.competencyIds.length, "competency", "competencies")}. Screening needs at least one per competency; I'd aim for 6+.`,
        items: rows.map((r) => ({ tone: r.n < 6 ? "warn" : "ok", title: competency(r.id)?.name ?? r.id, sub: plural(r.n, "question") })),
        actions: [{ label: "Open the question bank", href: `/trainer/courses/${c.id}/questions` }],
      };
    }
    if (c && has(p, "rollout", "assigned", "progress", "doing", "how is")) return courseRollout(s, c);

    if (has(p, "overdue", "behind", "late", "nudge")) {
      const ps = s.progress.filter(isOverdue);
      if (!ps.length) return { text: "Nobody is overdue right now." };
      const byCourse = new Map<string, Progress[]>();
      for (const x of ps) byCourse.set(x.courseId, [...(byCourse.get(x.courseId) ?? []), x]);
      const unstarted = ps.filter((x) => x.state === "not_started").length;
      return {
        text: `${plural(ps.length, "rep")} overdue across ${plural(byCourse.size, "course")}. ${unstarted * 2 > ps.length ? "Most haven't started, which is usually a reminder problem, not a content one." : "Most have started and stalled partway, so a nudge plus a manager check-in works best."}`,
        items: [...byCourse].map(([cid, list]) => ({ tone: "warn", title: courseOf(s, cid)?.title ?? cid, sub: `${list.length} overdue · ${list.filter((x) => x.state === "not_started").length} not started`, href: `/trainer/courses/${cid}` })),
        actions: [nudgeAll(s, ps, "u-maya")],
      };
    }
    if (has(p, "weak", "gap", "struggl", "competenc", "skill")) {
      const ps = s.progress.filter((x) => x.courseId === "c-lumora-launch");
      const rows = heatmap(s, ps, "assessment");
      const weak = weakestDomains(rows).slice(0, 3);
      const worstRegion = rows.map((r) => ({ name: r.name, v: r.cells.find((x) => x.domain === weak[0]?.domain.id)?.value })).filter((r) => r.v != null).sort((a, b) => a.v! - b.v!)[0];
      return {
        text: `On Lumora, the weakest area is ${weak[0]?.domain.name.toLowerCase()} (average ${weak[0]?.value}).${worstRegion ? ` ${worstRegion.name} is lowest there at ${worstRegion.v}.` : ""} A short booster on it would reach the most reps.`,
        items: weak.map((w) => ({ tone: w.value < 65 ? "danger" : w.value < 80 ? "warn" : "ok", title: w.domain.name, sub: `Average ${w.value}` })),
        actions: [{ label: "See the heatmap", href: "/trainer" }],
      };
    }
    if (has(p, "expir", "recert", "renew")) {
      const exp = s.courses.map((x) => ({ x, lv: live(x) })).filter(({ lv }) => lv?.expiresAt && daysFromToday(lv.expiresAt) <= 60);
      const certs = s.progress.filter((x) => x.certExpiresAt && daysFromToday(x.certExpiresAt) <= 60 && daysFromToday(x.certExpiresAt) >= 0);
      return {
        text: exp.length || certs.length ? `${plural(exp.length, "approval")} and ${plural(certs.length, "rep certification")} expire in the next 60 days.` : "Nothing expires in the next 60 days.",
        items: exp.map(({ x, lv }) => ({ tone: daysFromToday(lv!.expiresAt!) <= 30 ? "danger" : "warn", title: x.title, sub: `${lv!.docNumber} expires ${fmtDate(lv!.expiresAt)}`, href: `/trainer/courses/${x.id}/review` })),
        actions: certs.length ? [{ label: "Plan a recert campaign", href: "/trainer/campaigns" }] : [],
      };
    }
    if (has(p, "mlr", "review", "approv", "pipeline")) {
      const rows = s.courses.map((x) => ({ x, v: current(x) })).filter(({ v }) => v.state !== "published");
      return {
        text: rows.length ? `${plural(rows.length, "course")} in the MLR pipeline.` : "Everything is published. Nothing is in the MLR pipeline.",
        items: rows.map(({ x, v }) => ({ tone: v.state === "changes" ? "danger" : v.state === "approved" ? "warn" : "faint", title: `${x.title} v${v.version}`, sub: v.state.replace("_", " "), href: `/trainer/courses/${x.id}/review` })),
      };
    }
    if (has(p, "need", "today", "priorit", "todo", "to do")) {
      const q = trainerQueue(s);
      return { text: q.length ? `${plural(q.length, "thing")} in your queue, most urgent first.` : "Your queue is clear.", items: q };
    }
    return {
      text: "I can help you build and ship courses and keep the rollout on track. Try one of these:",
      items: [
        { title: "Build a course for a product", sub: "“Build a course for Arthelis”" },
        { title: "Find who's behind and nudge them", sub: "“Who's overdue?”" },
        { title: "Spot skill gaps", sub: "“Where are reps weakest?”" },
        { title: "Check a course before MLR", sub: "Open a course, then “Is this ready for MLR?”" },
      ],
    };
  },
};

/* ───────────────────────── Manager ───────────────────────── */

function team(ctx: Ctx) {
  const reps = ctx.s.users.filter((u) => u.managerId === ctx.me.id && u.active);
  const ids = new Set(reps.map((u) => u.id));
  return { reps, ps: ctx.s.progress.filter((p) => ids.has(p.userId)) };
}

function verifySummary(s: AppState, p: Progress): CoReply {
  const u = userOf(s, p.userId);
  const c = courseOf(s, p.courseId);
  const a = p.attempts.at(-1);
  if (!a || !u || !c) return { text: "There's no attempt to review yet." };
  const missed = a.call?.criteria.filter((x) => !x.met) ?? [];
  const flags = a.call?.flags ?? [];
  const critical = flags.some((f) => f.critical);
  const verdict = critical
    ? "Send it back. There's a critical compliance flag, which the system should already have failed."
    : missed.length > 1
      ? `Passed, but ${missed.length} rubric points were missed. Approve if you're comfortable, or send back with coaching on "${missed[0].label.toLowerCase()}".`
      : `Approve. ${u.first} passed cleanly${missed.length ? `, with one small miss on "${missed[0].label.toLowerCase()}"` : ""}.`;
  return {
    text: `${u.first} scored ${a.overall}% on ${c.title} (quiz ${a.quiz}%${a.roleplay !== undefined ? `, call ${a.roleplay}%` : ""}). ${verdict}`,
    items: [
      ...flags.map((f) => ({ tone: (f.critical ? "danger" : "warn") as Tone, title: f.label, sub: `“${f.quote}”` })),
      ...missed.map((m) => ({ tone: "warn" as Tone, title: `Missed: ${m.label}` })),
      ...(a.call?.criteria.filter((x) => x.met).slice(0, 2).map((m) => ({ tone: "ok" as Tone, title: `Did well: ${m.label}`, sub: m.quote ? `“${m.quote}”` : undefined })) ?? []),
    ],
  };
}

function oneOnOne(s: AppState, u: User): CoReply {
  const mine = s.progress.filter((p) => p.userId === u.id);
  const latest = (p: Progress) => p.attempts.at(-1)?.competencyScores ?? p.screening?.scores ?? {};
  const scores = mine.flatMap((p) => Object.entries(latest(p)));
  const weakest = [...scores].sort((a, b) => a[1] - b[1]).slice(0, 2);
  const flags = mine.flatMap((p) => p.attempts.flatMap((a) => a.call?.flags ?? []));
  const shared = s.practice.filter((x) => x.userId === u.id && x.shared).length;
  return {
    text: `For your 1:1 with ${u.first}: ${mine.map((p) => `${courseOf(s, p.courseId)?.title} is ${STATE_LABEL[p.state].toLowerCase()}`).join("; ")}.`,
    items: [
      ...weakest.map(([k, v]) => ({ tone: (v < 65 ? "danger" : "warn") as Tone, title: `Work on ${competency(k)?.name.toLowerCase()}`, sub: `Latest score ${v}` })),
      ...(flags.length ? [{ tone: "danger" as Tone, title: `Talk through: ${flags[0].label.toLowerCase()}`, sub: prohibited(flags[0].ruleId)?.explanation }] : []),
      { tone: "faint", title: shared ? `${plural(shared, "practice session")} shared with you` : "No practice shared with you", sub: "Practice is private unless the rep shares it" },
    ],
    actions: [
      { label: `Open ${u.first}'s record`, href: `/manager/team/${u.id}` },
      ...(weakest[0] ? [{ label: "Suggested question", run: () => `Try: “Walk me through how you'd handle ${competency(weakest[0][0])?.name.toLowerCase()} with a sceptical HCP.” Then listen for the approved points, not the exact words.` }] : []),
    ],
  };
}

export const managerBrain = {
  scope: "Uses your team's Academy records. Practice stays private unless a rep shares it.",
  briefing(ctx: Ctx): Briefing {
    const { s } = ctx;
    const vm = ctx.path.match(/^\/manager\/verify\/([^/]+)/);
    const vp = vm && s.progress.find((p) => p.id === vm[1]);
    if (vp) {
      const r = verifySummary(s, vp);
      return { title: `Reviewing ${userOf(s, vp.userId)?.first}`, text: r.text, items: r.items ?? [] };
    }
    const { ps } = team(ctx);
    const waiting = ps.filter((p) => p.state === "awaiting_verify").sort((a, b) => (a.verify?.requestedAt ?? "").localeCompare(b.verify?.requestedAt ?? ""));
    const coaching = ps.filter((p) => p.state === "needs_coaching");
    const overdue = ps.filter(isOverdue);
    const shared = s.practice.filter((x) => x.shared && !x.shared.seen && userOf(s, x.userId)?.managerId === ctx.me.id);
    const items: CoItem[] = [
      ...(waiting.length ? [{ tone: "warn" as Tone, title: `${plural(waiting.length, "rep")} waiting for you to verify`, sub: waiting[0].verify ? `Oldest since ${fmtDate(waiting[0].verify.requestedAt)}` : undefined, href: "/manager/verify" }] : []),
      ...(coaching.length ? [{ tone: "danger" as Tone, title: `${plural(coaching.length, "rep")} you sent back for coaching`, sub: coaching.map((p) => userOf(s, p.userId)?.first).join(", "), href: "/manager/team" }] : []),
      ...(overdue.length ? [{ tone: "warn" as Tone, title: `${plural(overdue.length, "rep")} overdue`, sub: "Ask me to nudge them", href: "/manager/team" }] : []),
      ...(shared.length ? [{ tone: "faint" as Tone, title: `${plural(shared.length, "practice session")} shared with you`, href: `/manager/shared/${shared[0].id}` }] : []),
    ];
    return { title: `Morning, ${ctx.me.first}`, text: items.length ? "Here's what needs you this week." : "Your team is on track. Nothing needs you.", items };
  },
  prompts(ctx: Ctx) {
    const { s } = ctx;
    if (/^\/manager\/verify\/[^/]+/.test(ctx.path)) return ["Summarise this call", "What should I coach on?", "Who else is waiting?"];
    const tm = ctx.path.match(/^\/manager\/team\/([^/]+)/);
    const u = tm ? userOf(s, tm[1]) : neediest(ctx);
    return ["Who needs me this week?", ...(u ? [`Prep my 1:1 with ${u.first}`] : []), "Who's behind?", "How is my team doing?"];
  },
  answer(prompt: string, ctx: Ctx): CoReply {
    const p = prompt.toLowerCase();
    const { s } = ctx;
    const { reps, ps } = team(ctx);
    const vm = ctx.path.match(/^\/manager\/verify\/([^/]+)/);
    const vp = vm && s.progress.find((x) => x.id === vm[1]);

    if (vp && has(p, "summar", "call", "this", "coach on", "should i")) return verifySummary(s, vp);
    const named = reps.find((u) => p.includes(u.first.toLowerCase()));
    const tm = ctx.path.match(/^\/manager\/team\/([^/]+)/);
    if (has(p, "1:1", "one on one", "1-1", "prep", "coach")) {
      const u = named ?? (tm ? userOf(s, tm[1]) : neediest(ctx));
      if (u) return oneOnOne(s, u);
    }
    if (has(p, "verify", "waiting", "approve")) {
      const w = ps.filter((x) => x.state === "awaiting_verify");
      return {
        text: w.length ? `${plural(w.length, "rep")} waiting. Each review takes about 4 minutes; you can listen at 1.5×.` : "Nobody is waiting for you to verify.",
        items: w.map((x) => ({ tone: "warn", title: `${userOf(s, x.userId)?.name} · ${courseOf(s, x.courseId)?.title}`, sub: `Passed ${fmtDate(x.attempts.at(-1)?.at)} · ${x.attempts.at(-1)?.overall}%`, href: `/manager/verify/${x.id}` })),
      };
    }
    if (has(p, "behind", "overdue", "late", "nudge")) {
      const o = ps.filter(isOverdue);
      return {
        text: o.length ? `${plural(o.length, "rep")} on your team are overdue.` : "Nobody on your team is overdue.",
        items: o.map((x) => ({ tone: "warn", title: userOf(s, x.userId)?.name ?? "", sub: `${courseOf(s, x.courseId)?.title} · ${STATE_LABEL[x.state].toLowerCase()} · due ${fmtDate(x.dueAt)}`, href: `/manager/team/${x.userId}` })),
        actions: o.length ? [nudgeAll(s, o, ctx.me.id)] : [],
      };
    }
    if (has(p, "team", "doing", "readiness", "compare", "region")) {
      const k = counts(ps);
      const region = s.progress.filter((x) => userOf(s, x.userId)?.regionId === ctx.me.regionId);
      const rk = counts(region);
      const weak = weakestDomains(heatmap(s, ps, "assessment", "district"))[0];
      return {
        text: `${pct(k.certified, k.total)}% of your team's assignments are certified, against ${pct(rk.certified, rk.total)}% across the region.${weak ? ` Your team's weakest area is ${weak.domain.name.toLowerCase()} (${weak.value}).` : ""}`,
        items: [
          { tone: "ok", title: `${k.certified} certified` },
          { tone: "faint", title: `${k.in_progress} in progress` },
          { tone: k.overdue ? "warn" : "faint", title: `${k.overdue} overdue` },
        ],
        actions: [{ label: "Open my team", href: "/manager/team" }],
      };
    }
    if (has(p, "need", "week", "today", "priorit")) {
      const b = managerBrain.briefing({ ...ctx, path: "/manager" });
      return { text: b.text, items: b.items };
    }
    return {
      text: "I help you stay on top of your team. Try:",
      items: [
        { title: "Summarise a call before you verify", sub: "Open a verification, then “Summarise this call”" },
        { title: "Prep a 1:1", sub: `“Prep my 1:1 with ${reps[0]?.first ?? "Priya"}”` },
        { title: "Find who's behind and nudge them", sub: "“Who's behind?”" },
      ],
    };
  },
};

/** The rep who most needs a conversation: coaching first, then overdue, then lowest score. */
function neediest(ctx: Ctx): User | undefined {
  const { ps } = team(ctx);
  const rank = (p: Progress) => (p.state === "needs_coaching" ? 0 : isOverdue(p) ? 1 : 2);
  const p = [...ps].sort((a, b) => rank(a) - rank(b) || (a.attempts.at(-1)?.overall ?? 100) - (b.attempts.at(-1)?.overall ?? 100))[0];
  return p && userOf(ctx.s, p.userId);
}

/* ───────────────────────── Rep ───────────────────────── */

function repNext(ctx: Ctx) {
  const mine = ctx.s.progress.filter((p) => p.userId === ctx.me.id && p.state !== "certified");
  const ordered = [...mine].sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
  for (const p of ordered) {
    const c = courseOf(ctx.s, p.courseId);
    const step = c && nextStepFor(p, c);
    if (step) return step;
  }
  return null;
}

/** The module the rep is looking at (player ?module=), or the next one in their path. */
function repModule(ctx: Ctx): { course: Course; module: Module } | undefined {
  const c = pageCourse(ctx);
  if (!c) return undefined;
  const mid = ctx.search.get("module");
  const mods = modulesOf(c);
  const byId = mid ? mods.find((m) => m.id === mid) : undefined;
  if (byId) return { course: c, module: byId };
  const p = ctx.s.progress.find((x) => x.userId === ctx.me.id && x.courseId === c.id);
  const nb = p && nextBlock(p, c);
  return nb ? { course: c, module: nb.module } : { course: c, module: mods[0] };
}

const cite = (sid?: string, page?: number) => (sid ? `${source(sid)?.title ?? "Source"}${page ? `, p. ${page}` : ""}` : undefined);

export const repBrain = {
  scope: "Answers only from approved course content. Off during screening and assessments.",
  briefing(ctx: Ctx): Briefing {
    const step = repNext(ctx);
    const mine = ctx.s.progress.filter((p) => p.userId === ctx.me.id);
    const due = mine.filter((p) => p.state !== "certified" && p.dueAt).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!));
    return {
      title: `Hi ${ctx.me.first}`,
      text: step ? `Next up: ${step.title}. ${step.why}` : "You're all caught up. Practice keeps it fresh.",
      items: [
        ...(step ? [{ tone: "ok" as Tone, title: step.cta, sub: step.eyebrow, href: step.href }] : []),
        ...due.slice(0, 2).map((p) => ({ tone: (isOverdue(p) ? "danger" : daysFromToday(p.dueAt!) <= 7 ? "warn" : "faint") as Tone, title: courseOf(ctx.s, p.courseId)?.title ?? "", sub: `${isOverdue(p) ? "Overdue" : "Due"} ${fmtDate(p.dueAt)} · ${pathProgress(p, courseOf(ctx.s, p.courseId)!).pct}% done` })),
      ],
    };
  },
  prompts(ctx: Ctx) {
    const onCourse = !!pageCourse(ctx);
    return [
      onCourse ? "Explain this module simply" : "What should I do next?",
      "Help me with the cost objection",
      "Can I talk about use in teens?",
      "Quiz me for 2 minutes",
    ];
  },
  answer(prompt: string, ctx: Ctx): CoReply {
    const p = ` ${prompt.toLowerCase()} `;

    // Compliance first: off-label or comparative questions get the same answer every time.
    if (OFF_LABEL_HINTS.some((h) => p.includes(h))) {
      return {
        text: "That's outside the approved label, so I can't help you say anything about it, and neither can you in a call. If an HCP asks, say it isn't approved for that use and offer to submit a Medical Information request. That's a pass on the rubric; anything else is an automatic fail.",
        actions: [{ label: "Practise this trap", href: "/rep/practice/prep" }],
      };
    }
    if (COMPARATIVE_HINTS.some((h) => p.includes(h))) {
      return { text: "There are no head-to-head studies, so comparative claims aren't approved. Stick to what the label and approved materials say about this product on its own." };
    }
    if (has(p, "explain", "summar", "module", "key point", "simply", "what is this")) {
      const r = repModule(ctx);
      if (!r) return { text: "Open a course and I'll explain the module you're on, using its approved key points." };
      const pts = r.module.blocks.flatMap((b) => b.points ?? []).slice(0, 4);
      const paras = pts.length ? pts : r.module.blocks.flatMap((b) => b.paragraphs ?? []).slice(0, 3);
      return {
        text: `${r.module.title}, in short: ${r.module.summary} Here are the approved key points, word for word:`,
        items: paras.map((x) => ({ title: x.text, sub: cite(x.cite?.sourceId, x.cite?.page) })),
        actions: [{ label: "Open the module", href: `/rep/course/${r.course.id}/learn?module=${r.module.id}` }],
      };
    }
    const ob = OBJECTIONS.find((o) => o.keywords.some((k) => p.includes(k)) || o.label.toLowerCase().split(/\W+/).some((w) => w.length > 3 && p.includes(w)));
    if (ob || has(p, "objection", "pushback", "handle")) {
      const o = ob ?? OBJECTIONS[0];
      return {
        text: `“${o.line}” A strong answer acknowledges the concern first, then covers what's approved:`,
        // Rubric cues, minus ones another cue already covers ("hub" inside "access hub").
        items: o.keywords.filter((k) => !o.keywords.some((x) => x !== k && x.includes(k))).slice(0, 3)
          .map((k) => ({ title: k[0].toUpperCase() + k.slice(1), sub: competency(o.competency)?.name })),
        actions: [{ label: "Practise it with an AI doctor", href: "/rep/practice/prep" }],
      };
    }
    if (has(p, "quiz", "test me", "flashcard", "revise")) {
      return { text: "Five quick questions from your courses' practice pool. Nothing is recorded or shared.", actions: [{ label: "Start a quick quiz", href: "/rep/practice/quiz" }, { label: "Flashcards", href: "/rep/practice/flashcards" }] };
    }
    if (has(p, "score", "how am i", "weak", "improve")) {
      const mine = ctx.s.progress.filter((x) => x.userId === ctx.me.id);
      const scores = mine.flatMap((x) => Object.entries(x.attempts.at(-1)?.competencyScores ?? x.screening?.scores ?? {}));
      if (!scores.length) return { text: "No scores yet. Your screening sets your baseline." };
      const sorted = [...scores].sort((a, b) => a[1] - b[1]);
      return { text: `Your strongest area is ${competency(sorted.at(-1)![0])?.name.toLowerCase()}. The biggest gain is in ${competency(sorted[0][0])?.name.toLowerCase()}.`, items: sorted.slice(0, 3).map(([k, v]) => ({ tone: v < 50 ? "danger" : v < 80 ? "warn" : "ok", title: competency(k)?.name ?? k, sub: `Latest ${v}` })) };
    }
    if (has(p, "due", "deadline", "when")) {
      const mine = ctx.s.progress.filter((x) => x.userId === ctx.me.id && x.state !== "certified" && x.dueAt);
      return { text: mine.length ? "Your deadlines:" : "Nothing has a deadline right now.", items: mine.map((x) => ({ tone: isOverdue(x) ? "danger" : "faint", title: courseOf(ctx.s, x.courseId)?.title ?? "", sub: `Due ${fmtDate(x.dueAt)}` })) };
    }
    const step = repNext(ctx);
    if (has(p, "next", "what should", "today", "start")) {
      return step ? { text: `${step.title}. ${step.why}`, actions: [{ label: step.cta, href: step.href }] } : { text: "You're all caught up. Try a practice call to stay sharp.", actions: [{ label: "Practice", href: "/rep/practice" }] };
    }
    return {
      text: "I can explain what you're learning, help you prepare for objections and keep you on track. I only use approved content.",
      items: [
        { title: "“What should I do next?”" },
        { title: "“Explain this module simply”", sub: "On any course or module" },
        { title: "“Help me with the cost objection”" },
      ],
    };
  },
};

export const BRAINS = { trainer: trainerBrain, manager: managerBrain, rep: repBrain };
