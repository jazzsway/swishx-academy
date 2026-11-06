"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Attempt, AudienceRules, Campaign, Course, CourseSettings, CourseVersion, District, MlrComment,
  Module, Notification, PracticeSession, Progress, RoleplayResult, User,
} from "@/data/types";
import { seed } from "@/data/seed";
import { TODAY } from "@/data/org";
import { buildPath } from "@/lib/learning";

export interface OrgSettings {
  practiceRetentionDays: number;
  recordingRetention: string;
  consentText: string;
  leaderboard: "off" | "team" | "optin";
  weekendBreaksStreak: boolean;
  recertMonths: number;
  managersMayAssign: boolean;
  bands: { developing: number; proficient: number; expert: number };
  brandColor: string;
}

const DEFAULT_SETTINGS: OrgSettings = {
  practiceRetentionDays: 30,
  recordingRetention: "Certification validity + 1 year",
  consentText:
    "Voice sessions are recorded and analysed by AI to score your conversation. Assessment recordings can be heard by you, your manager and your trainer, and are kept for your certification period plus one year. Practice recordings are visible only to you and delete after 30 days. No voiceprint is created.",
  leaderboard: "off",
  weekendBreaksStreak: false,
  recertMonths: 12,
  managersMayAssign: true,
  bands: { developing: 50, proficient: 80, expert: 95 },
  brandColor: "#fd4816",
};

type Seeded = ReturnType<typeof seed>;

export interface AppState extends Seeded {
  hydrated: boolean;
  viewAsId: string;
  onboarded: Record<string, boolean>;
  voiceConsent: Record<string, boolean>;
  streaks: Record<string, { days: number; last: string }>;
  xpBase: Record<string, number>;
  settings: OrgSettings;
  nudges: Record<string, string>;
  competencyEdits: Record<string, { name: string; description: string }>;

  setHydrated: () => void;
  viewAs: (userId: string) => void;
  resetDemo: () => void;
  completeOnboarding: (userId: string) => void;
  setVoiceConsent: (userId: string, v: boolean) => void;
  touchStreak: (userId: string) => void;
  notify: (n: Omit<Notification, "id" | "at" | "read">) => void;
  markRead: (userId: string, id?: string) => void;

  /* Trainer: courses */
  createCourse: (c: Pick<Course, "title" | "productId" | "format" | "type" | "objective" | "audience" | "sourceIds" | "competencyIds">) => string;
  setModules: (courseId: string, modules: Module[]) => void;
  updateCourse: (courseId: string, patch: Partial<Course>) => void;
  updateSettings: (courseId: string, patch: Partial<CourseSettings>) => void;
  startNewVersion: (courseId: string) => void;
  backToDraft: (courseId: string) => void;
  markReady: (courseId: string, acknowledged: string[]) => void;
  markSubmitted: (courseId: string, d: { date: string; vaultId?: string; note?: string }) => void;
  recordChanges: (courseId: string, comments: string[]) => void;
  resolveComment: (courseId: string, commentId: string, resolved: boolean) => void;
  recordApproval: (courseId: string, d: { docNumber: string; approvedAt: string; expiresAt: string }) => void;
  publish: (courseId: string, transition: "minor" | "recertify" | "restart") => void;
  withdraw: (courseId: string, reason: string) => void;
  assign: (courseId: string, rules: AudienceRules, type: Progress["assignType"], dueAt: string | undefined, campaignId?: string) => number;
  createCampaign: (c: Omit<Campaign, "id" | "status" | "ownerId">) => string;

  /* Rep */
  startCourse: (progressId: string) => void;
  skipScreening: (progressId: string) => void;
  saveScreening: (progressId: string, d: { overall: number; scores: Record<string, number>; call?: RoleplayResult }) => void;
  completeBlock: (progressId: string, blockId: string, minutes: number) => void;
  submitAssessment: (progressId: string, attempt: Attempt) => void;
  attest: (progressId: string, name: string) => void;
  addPractice: (s: Omit<PracticeSession, "id" | "deletesAt">) => string;
  setPracticeShared: (id: string, shared: boolean) => void;
  deletePractice: (id: string) => void;
  markPracticeSeen: (id: string) => void;

  /* Manager */
  decideVerify: (progressId: string, d: { approve: boolean; note: string; focus: string[]; by: string; delegate?: boolean }) => void;
  nudge: (progressId: string, by: string) => boolean;
  addCoachingNote: (progressId: string, by: string, text: string) => void;

  /* Admin */
  addUser: (u: Omit<User, "id" | "initials" | "active">) => void;
  setUserActive: (id: string, active: boolean) => void;
  updateOrgSettings: (patch: Partial<OrgSettings>) => void;
  editCompetency: (id: string, v: { name: string; description: string }) => void;
}

const nowIso = () => {
  /* Demo clock: the fixed demo day, at the real time of day, so ordering still works. */
  const real = new Date();
  const d = new Date(TODAY);
  d.setHours(real.getHours(), real.getMinutes(), real.getSeconds());
  return d.toISOString();
};
const dayStr = (iso: string) => iso.slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

function initial() {
  const s = seed();
  return {
    ...s,
    viewAsId: "u-maya",
    onboarded: { "u-david": true } as Record<string, boolean>,
    voiceConsent: { "u-david": true } as Record<string, boolean>,
    streaks: { "u-priya": { days: 6, last: "2026-11-05" } } as Record<string, { days: number; last: string }>,
    xpBase: { "u-priya": 940, "u-david": 1320 } as Record<string, number>,
    settings: DEFAULT_SETTINGS,
    nudges: {} as Record<string, string>,
    competencyEdits: {} as Record<string, { name: string; description: string }>,
  };
}

export const current = (c: Course): CourseVersion => c.versions[c.versions.length - 1];
export const live = (c: Course): CourseVersion | undefined =>
  [...c.versions].reverse().find((v) => v.state === "published");

function mapCourse(state: AppState, id: string, fn: (c: Course) => Course): Partial<AppState> {
  return { courses: state.courses.map((c) => (c.id === id ? { ...fn(c), updatedAt: dayStr(nowIso()) } : c)) };
}

function mapCurrent(c: Course, fn: (v: CourseVersion) => CourseVersion): Course {
  return { ...c, versions: c.versions.map((v, i) => (i === c.versions.length - 1 ? fn(v) : v)) };
}

function hist(v: CourseVersion, action: string, note?: string): CourseVersion {
  return { ...v, history: [...v.history, { at: dayStr(nowIso()), by: "Maya Chen", action, note }] };
}

function matches(u: User, r: AudienceRules) {
  if (!u.active) return false;
  if (r.userIds.includes(u.id)) return true;
  if (r.roles.length && !r.roles.some((x) => u.roles.includes(x))) return false;
  if (r.divisionIds.length && !r.divisionIds.includes(u.divisionId ?? "")) return false;
  if (r.regionIds.length && !r.regionIds.includes(u.regionId ?? "")) return false;
  if (r.districtIds.length && !r.districtIds.includes(u.districtId ?? "")) return false;
  if (r.hiredWithinDays) {
    const days = (TODAY.getTime() - new Date(u.hireDate).getTime()) / 86400000;
    if (days > r.hiredWithinDays) return false;
  }
  return r.roles.length + r.divisionIds.length + r.regionIds.length + r.districtIds.length + (r.hiredWithinDays ? 1 : 0) > 0;
}

export function audienceMatches(users: User[], r: AudienceRules) {
  return users.filter((u) => matches(u, r));
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial(),
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),
      viewAs: (userId) => set({ viewAsId: userId }),
      resetDemo: () => set({ ...initial(), hydrated: true }),
      completeOnboarding: (userId) => set((s) => ({ onboarded: { ...s.onboarded, [userId]: true } })),
      setVoiceConsent: (userId, v) => set((s) => ({ voiceConsent: { ...s.voiceConsent, [userId]: v } })),

      touchStreak: (userId) =>
        set((s) => {
          const today = dayStr(TODAY.toISOString());
          const cur = s.streaks[userId];
          if (cur?.last === today) return {};
          const yesterday = addDays(TODAY.toISOString(), -1);
          const days = cur && cur.last === yesterday ? cur.days + 1 : 1;
          return { streaks: { ...s.streaks, [userId]: { days, last: today } } };
        }),

      notify: (n) =>
        set((s) => ({ notifications: [{ ...n, id: uid("n"), at: nowIso(), read: false }, ...s.notifications] })),
      markRead: (userId, id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.userId === userId && (!id || n.id === id) ? { ...n, read: true } : n)),
        })),

      createCourse: (c) => {
        const id = uid("c");
        const course: Course = {
          ...c, id, modules: [], items: [], scenarioIds: c.type === "personalised" ? ["sc-kim"] : [],
          settings: {
            ...get().courses.find((x) => x.id === "c-lumora-launch")!.settings,
            screening: c.type === "personalised",
            screeningCall: false,
            verify: c.type === "personalised" ? "manager" : "auto",
            completion: c.type === "personalised"
              ? { path: true, assessment: true, verify: true, attestation: true, checks: 0 }
              : { path: true, assessment: false, verify: false, attestation: true, checks: 80 },
          },
          versions: [{ version: 1, versionId: `NEW-v1-${id.slice(-4)}`, state: "draft", comments: [], acknowledged: [], modules: [],
            history: [{ at: dayStr(nowIso()), by: "Maya Chen", action: "Created with AI" }] }],
          ownerId: "u-maya", updatedAt: dayStr(nowIso()),
        };
        set((s) => ({ courses: [course, ...s.courses] }));
        return id;
      },

      setModules: (courseId, modules) =>
        set((s) => mapCourse(s, courseId, (c) => mapCurrent({ ...c, modules }, (v) => (v.state === "draft" ? { ...v, modules } : v)))),

      updateCourse: (courseId, patch) => set((s) => mapCourse(s, courseId, (c) => ({ ...c, ...patch }))),

      updateSettings: (courseId, patch) =>
        set((s) => mapCourse(s, courseId, (c) => ({ ...c, settings: { ...c.settings, ...patch } }))),

      startNewVersion: (courseId) =>
        set((s) =>
          mapCourse(s, courseId, (c) => {
            const last = current(c);
            if (last.state === "draft" || last.state === "changes") return c;
            const base = live(c) ?? last;
            const v: CourseVersion = {
              version: last.version + 1, versionId: `${c.id.slice(2, 8).toUpperCase()}-v${last.version + 1}-${uid("x").slice(-4)}`,
              state: "draft", comments: [], acknowledged: [], modules: base.modules,
              history: [{ at: dayStr(nowIso()), by: "Maya Chen", action: `Draft v${last.version + 1} created from v${base.version}` }],
            };
            return { ...c, modules: base.modules, versions: [...c.versions, v] };
          }),
        ),

      backToDraft: (courseId) =>
        set((s) => mapCourse(s, courseId, (c) => mapCurrent(c, (v) => (v.state === "ready" ? hist({ ...v, state: "draft", packageAt: undefined }, "Edited · package voided") : v)))),

      markReady: (courseId, acknowledged) =>
        set((s) =>
          mapCourse(s, courseId, (c) =>
            mapCurrent(c, (v) => hist({ ...v, state: "ready", modules: c.modules, acknowledged, packageAt: dayStr(nowIso()) }, "Checks passed · MLR package generated", acknowledged.length ? `${acknowledged.length} warning(s) acknowledged` : undefined)),
          ),
        ),

      markSubmitted: (courseId, d) =>
        set((s) => mapCourse(s, courseId, (c) => mapCurrent(c, (v) => hist({ ...v, state: "in_review", submittedAt: d.date, vaultId: d.vaultId }, "Marked as submitted", d.vaultId ? `Vault ${d.vaultId}` : d.note)))),

      recordChanges: (courseId, comments) =>
        set((s) =>
          mapCourse(s, courseId, (c) =>
            mapCurrent(c, (v) => hist({ ...v, state: "changes", comments: comments.map<MlrComment>((t) => ({ id: uid("mc"), text: t, resolved: false })) }, "Changes requested", `${comments.length} comment(s)`)),
          ),
        ),

      resolveComment: (courseId, commentId, resolved) =>
        set((s) => mapCourse(s, courseId, (c) => mapCurrent(c, (v) => ({ ...v, comments: v.comments.map((m) => (m.id === commentId ? { ...m, resolved } : m)) })))),

      recordApproval: (courseId, d) =>
        set((s) => mapCourse(s, courseId, (c) => mapCurrent(c, (v) => hist({ ...v, state: "approved", docNumber: d.docNumber, approvedAt: d.approvedAt, expiresAt: d.expiresAt }, "Recorded approval", d.docNumber)))),

      publish: (courseId, transition) => {
        const s = get();
        const course = s.courses.find((c) => c.id === courseId)!;
        const cur = current(course);
        const prevLive = live(course);
        set((st) =>
          mapCourse(st, courseId, (c) => ({
            ...c,
            versions: c.versions.map((v) =>
              v.version === cur.version
                ? hist({ ...v, state: "published", publishedAt: dayStr(nowIso()), transition }, "Published", transition === "recertify" ? "Everyone recertifies" : transition === "minor" ? "Minor update · progress carries over" : "Restart")
                : v.state === "published" ? hist({ ...v, state: "superseded" }, `Superseded by v${cur.version}`) : v,
            ),
          })),
        );
        if (!prevLive) return;
        set((st) => ({
          progress: st.progress.map((p) => {
            if (p.courseId !== courseId || p.version !== prevLive.version) return p;
            if (transition === "minor") return { ...p, version: cur.version };
            if (transition === "restart") return { ...p, version: cur.version, state: "not_started", completedBlocks: [], path: undefined, screening: undefined, attempts: [], verify: undefined, certifiedAt: undefined };
            return { ...p, version: cur.version, state: p.state === "certified" ? "learning" : p.state, completedBlocks: [], certifiedAt: undefined, verify: undefined, attempts: [], dueAt: addDays(TODAY.toISOString(), 14), assignType: "required" };
          }),
        }));
      },

      withdraw: (courseId, reason) =>
        set((s) => mapCourse(s, courseId, (c) => ({ ...c, versions: c.versions.map((v) => (v.state === "published" ? hist({ ...v, state: "withdrawn" }, "Withdrawn", reason) : v)) }))),

      assign: (courseId, rules, type, dueAt, campaignId) => {
        const s = get();
        const course = s.courses.find((c) => c.id === courseId)!;
        const v = live(course)?.version ?? current(course).version;
        const already = new Set(s.progress.filter((p) => p.courseId === courseId).map((p) => p.userId));
        const targets = audienceMatches(s.users, rules).filter((u) => !already.has(u.id));
        const at = dayStr(nowIso());
        const created: Progress[] = targets.map((u) => ({
          id: `p-${u.id}-${courseId}-${uid("a").slice(-4)}`, userId: u.id, courseId, version: v, state: "not_started",
          assignedAt: at, dueAt, assignType: type, campaignId, completedBlocks: [], minutesSpent: 0, attempts: [], coachingNotes: [],
        }));
        const notes: Notification[] = targets.slice(0, 400).map((u) => ({
          id: uid("n"), userId: u.id, at: nowIso(), read: false,
          title: type === "recommended" ? "Recommended course" : "New course assigned",
          body: `${course.title}${dueAt ? ` · due ${new Date(dueAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}` : ""}`,
          href: `/rep/course/${courseId}`,
        }));
        set((st) => ({ progress: [...st.progress, ...created], notifications: [...notes, ...st.notifications] }));
        return created.length;
      },

      createCampaign: (c) => {
        const id = uid("cmp");
        set((s) => ({ campaigns: [{ ...c, id, status: "active", ownerId: "u-maya" }, ...s.campaigns] }));
        return id;
      },

      startCourse: (progressId) =>
        set((s) => ({
          progress: s.progress.map((p) => {
            if (p.id !== progressId || p.state !== "not_started") return p;
            const course = s.courses.find((c) => c.id === p.courseId)!;
            const startedAt = dayStr(nowIso());
            if (!course.settings.screening) {
              const mods = (live(course) ?? current(course)).modules;
              return { ...p, startedAt, state: "learning", path: buildPath(mods, {}, "full") };
            }
            return { ...p, startedAt, state: "screening" };
          }),
        })),

      skipScreening: (progressId) =>
        set((s) => ({
          progress: s.progress.map((p) => {
            if (p.id !== progressId) return p;
            const course = s.courses.find((c) => c.id === p.courseId)!;
            const mods = (live(course) ?? current(course)).modules;
            return { ...p, state: "learning", startedAt: p.startedAt ?? dayStr(nowIso()), path: buildPath(mods, {}, "full") };
          }),
        })),

      saveScreening: (progressId, d) =>
        set((s) => ({
          progress: s.progress.map((p) => {
            if (p.id !== progressId) return p;
            const course = s.courses.find((c) => c.id === p.courseId)!;
            const mods = (live(course) ?? current(course)).modules;
            return {
              ...p, state: "learning", startedAt: p.startedAt ?? dayStr(nowIso()),
              screening: { at: nowIso(), ...d }, path: buildPath(mods, d.scores, "screening", { aiReorder: course.settings.aiReorder }),
            };
          }),
        })),

      completeBlock: (progressId, blockId, minutes) =>
        set((s) => ({
          progress: s.progress.map((p) =>
            p.id === progressId && !p.completedBlocks.includes(blockId)
              ? { ...p, completedBlocks: [...p.completedBlocks, blockId], minutesSpent: p.minutesSpent + minutes }
              : p,
          ),
        })),

      submitAssessment: (progressId, attempt) =>
        set((s) => ({
          progress: s.progress.map((p) => {
            if (p.id !== progressId) return p;
            const attempts = [...p.attempts, attempt];
            if (attempt.passed) return { ...p, attempts, state: "assessment" };
            const course = s.courses.find((c) => c.id === p.courseId)!;
            const mods = (live(course) ?? current(course)).modules;
            const failedScores: Record<string, number> = {};
            for (const [k, v] of Object.entries(attempt.competencyScores)) failedScores[k] = attempt.failedCompetencies.includes(k) ? Math.min(v, 49) : Math.max(v, 80);
            const path = buildPath(mods, failedScores, "remediation");
            /* A retake path is re-learned, so its blocks start fresh. */
            const redo = new Set(mods.filter((m) => path.moduleIds.includes(m.id)).flatMap((m) => m.blocks.map((b) => b.id)));
            return { ...p, attempts, state: "remediation", path, completedBlocks: p.completedBlocks.filter((b) => !redo.has(b)) };
          }),
        })),

      attest: (progressId, name) => {
        const s = get();
        const p = s.progress.find((x) => x.id === progressId)!;
        const course = s.courses.find((c) => c.id === p.courseId)!;
        const user = s.users.find((u) => u.id === p.userId)!;
        const at = nowIso();
        const needsManager = course.settings.verify === "manager" && course.type === "personalised";
        set((st) => ({
          progress: st.progress.map((x) =>
            x.id !== progressId ? x
              : needsManager
                ? { ...x, attestedAt: at, attestName: name, state: "awaiting_verify", verify: { status: "pending", requestedAt: dayStr(at) } }
                : { ...x, attestedAt: at, attestName: name, state: "certified", certifiedAt: dayStr(at), certExpiresAt: addDays(at, course.settings.recertMonths * 30) },
          ),
        }));
        if (needsManager && user.managerId) {
          get().notify({ userId: user.managerId, title: "Waiting for your sign-off", body: `${user.name} passed ${course.title}. Review the recorded call.`, href: `/manager/verify/${progressId}` });
        }
      },

      addPractice: (sess) => {
        const id = uid("ps");
        const deletesAt = addDays(nowIso(), get().settings.practiceRetentionDays);
        set((s) => ({ practice: [{ ...sess, id, deletesAt }, ...s.practice] }));
        return id;
      },
      setPracticeShared: (id, shared) => {
        const s = get();
        const ps = s.practice.find((x) => x.id === id)!;
        set((st) => ({ practice: st.practice.map((x) => (x.id === id ? { ...x, shared: shared ? { at: nowIso(), seen: false } : undefined } : x)) }));
        const user = s.users.find((u) => u.id === ps.userId);
        if (shared && user?.managerId) get().notify({ userId: user.managerId, title: "A practice session was shared with you", body: `${user.name} shared "${ps.title}" for coaching.`, href: `/manager/team/${user.id}` });
      },
      deletePractice: (id) => set((s) => ({ practice: s.practice.filter((x) => x.id !== id) })),
      markPracticeSeen: (id) => set((s) => ({ practice: s.practice.map((x) => (x.id === id && x.shared ? { ...x, shared: { ...x.shared, seen: true } } : x)) })),

      decideVerify: (progressId, d) => {
        const s = get();
        const p = s.progress.find((x) => x.id === progressId)!;
        const course = s.courses.find((c) => c.id === p.courseId)!;
        const at = nowIso();
        const mods = (live(course) ?? current(course)).modules;
        set((st) => ({
          progress: st.progress.map((x) => {
            if (x.id !== progressId) return x;
            const verify = { ...x.verify!, status: d.approve ? ("approved" as const) : ("needs_coaching" as const), by: d.by, at: dayStr(at), note: d.note, focus: d.focus, delegate: d.delegate };
            const notes = d.note ? [...x.coachingNotes, { at, by: d.by, text: d.note }] : x.coachingNotes;
            if (d.approve) return { ...x, verify, coachingNotes: notes, state: "certified", certifiedAt: dayStr(at), certExpiresAt: addDays(at, course.settings.recertMonths * 30) };
            const scores: Record<string, number> = {};
            for (const m of mods) scores[m.competency] = d.focus.includes(m.competency) ? 40 : 90;
            const path = buildPath(mods, scores, "remediation", { focus: d.focus });
            const redo = new Set(mods.filter((m) => path.moduleIds.includes(m.id) && d.focus.includes(m.competency)).flatMap((m) => m.blocks.map((b) => b.id)));
            return { ...x, verify, coachingNotes: notes, state: "needs_coaching", path, completedBlocks: x.completedBlocks.filter((b) => !redo.has(b)) };
          }),
        }));
        get().notify({
          userId: p.userId,
          title: d.approve ? `You're certified on ${course.title}` : "Your manager left coaching notes",
          body: d.approve ? "Your certificate is ready." : `Focus areas added to your path for ${course.title}.`,
          href: d.approve ? "/rep/me" : `/rep/course/${course.id}`,
        });
      },

      nudge: (progressId, by) => {
        const s = get();
        const last = s.nudges[progressId];
        if (last && Date.now() - new Date(last).getTime() < 48 * 3600 * 1000) return false;
        const p = s.progress.find((x) => x.id === progressId)!;
        const course = s.courses.find((c) => c.id === p.courseId)!;
        const from = s.users.find((u) => u.id === by);
        set((st) => ({ nudges: { ...st.nudges, [progressId]: new Date().toISOString() } }));
        get().notify({ userId: p.userId, title: `A nudge from ${from?.first ?? "your trainer"}`, body: `Keep going on ${course.title}. You've got this.`, href: `/rep/course/${course.id}` });
        return true;
      },

      addCoachingNote: (progressId, by, text) =>
        set((s) => ({ progress: s.progress.map((p) => (p.id === progressId ? { ...p, coachingNotes: [...p.coachingNotes, { at: nowIso(), by, text }] } : p)) })),

      addUser: (u) =>
        set((s) => ({
          users: [...s.users, { ...u, id: uid("u"), initials: u.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase(), active: true }],
        })),
      setUserActive: (id, active) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, active } : u)) })),
      updateOrgSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      editCompetency: (id, v) => set((s) => ({ competencyEdits: { ...s.competencyEdits, [id]: v } })),
    }),
    {
      name: "swishx-academy-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ hydrated: _h, ...rest }) => {
        void _h;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function")) as Partial<AppState>;
      },
    },
  ),
);

export type { District };
