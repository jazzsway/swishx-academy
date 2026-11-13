import type {
  Attempt, Campaign, Course, District, Notification, PracticeSession, Progress, User,
} from "./types";
import { COMPETENCIES, DISTRICTS, REGIONS } from "./org";
import { seedCourses } from "./courses";
import { buildPath } from "@/lib/learning";

/* Deterministic generator: the same ~230 fictional people and the same story every reset. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FIRST = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn", "Dana", "Rowan", "Elena", "Marcus", "Nadia", "Omar", "Grace", "Leo", "Hana", "Victor", "Imani", "Theo", "Lucia", "Kenji", "Amara", "Ben", "Chloe", "Diego", "Fatima", "Gabe", "Ines", "Jonah", "Keira", "Liam", "Maya", "Noor", "Owen", "Pia", "Rafael", "Sara", "Tomas", "Uma", "Wes", "Yara", "Zane", "Asha", "Bruno", "Carmen", "Devin", "Esme"];
const LAST = ["Nguyen", "Patel", "Garcia", "Johnson", "Kim", "Okafor", "Rossi", "Silva", "Cohen", "Ahmed", "Brooks", "Diaz", "Evans", "Foster", "Hughes", "Ibrahim", "Jensen", "Khan", "Lopez", "Morales", "Novak", "Ortega", "Park", "Quinn", "Reyes", "Shapiro", "Turner", "Usman", "Vargas", "Walsh", "Young", "Zhang", "Bennett", "Castillo", "Dubois", "Ellis", "Fischer", "Gupta", "Haddad", "Ito"];

const SIZES: Record<string, number> = {
  "d-northeast": 9, "d-midatlantic": 17, "d-newengland": 14, "d-greatlakes": 16, "d-plains": 14, "d-ohiovalley": 15,
  "d-gulf": 16, "d-southeast": 17, "d-texas": 18, "d-pacificnw": 14, "d-socal": 16, "d-mountain": 14,
  "d-carolinas": 12, "d-chesapeake": 12, "d-bay": 12, "d-desert": 12,
};

const MANAGER_NAMES: Record<string, string> = {
  "d-northeast": "David Ortiz", "d-midatlantic": "Renee Walsh", "d-newengland": "Paul Novak", "d-greatlakes": "Kara Jensen",
  "d-plains": "Mitch Evans", "d-ohiovalley": "Lena Fischer", "d-gulf": "Andre Brooks", "d-southeast": "Tasha Reyes",
  "d-texas": "Hector Morales", "d-pacificnw": "Ingrid Park", "d-socal": "Felix Ortega", "d-mountain": "June Hughes",
  "d-carolinas": "Owen Castillo", "d-chesapeake": "Mira Gupta", "d-bay": "Sean Ito", "d-desert": "Rita Haddad",
};

const TERRITORIES: Record<string, string[]> = {
  "d-northeast": ["Boston", "Worcester", "Providence", "Hartford", "Springfield", "Manchester", "Portland", "Burlington", "Albany"],
};

const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const email = (name: string) => `${name.toLowerCase().replace(/[^a-z ]/g, "").replace(" ", ".")}@corvana.example`;
const day = (iso: string, plus: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + plus);
  return d.toISOString().slice(0, 10);
};

export interface SeedState {
  users: User[];
  districts: District[];
  courses: Course[];
  progress: Progress[];
  campaigns: Campaign[];
  practice: PracticeSession[];
  notifications: Notification[];
}

export function seed(): SeedState {
  const r = rng(42);
  const users: User[] = [
    { id: "u-maya", name: "Maya Chen", first: "Maya", initials: "MC", email: "maya.chen@corvana.example", roles: ["trainer", "admin"], title: "Commercial Training Lead", hireDate: "2021-04-12", active: true },
  ];
  const districts: District[] = [];

  for (const d of DISTRICTS) {
    const region = REGIONS.find((x) => x.id === d.regionId)!;
    const mName = MANAGER_NAMES[d.id];
    const managerId = d.id === "d-northeast" ? "u-david" : `u-mgr-${d.id.slice(2)}`;
    users.push({
      id: managerId, name: mName, first: mName.split(" ")[0], initials: initials(mName), email: email(mName),
      roles: ["manager"], title: `District Manager, ${d.name}`, divisionId: region.divisionId, regionId: region.id,
      districtId: d.id, hireDate: "2019-06-03", active: true,
    });
    districts.push({ ...d, managerId });

    for (let i = 0; i < SIZES[d.id]; i++) {
      const isPriya = d.id === "d-northeast" && i === 0;
      const name = isPriya ? "Priya Shah" : `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
      const tenure = Math.floor(r() * 9);
      users.push({
        id: isPriya ? "u-priya" : `u-${d.id.slice(2)}-${i}`,
        name, first: name.split(" ")[0], initials: initials(name), email: email(name),
        roles: ["rep"],
        title: region.divisionId === "div-imm" ? "Dermatology Specialist" : "Cardiology Specialist",
        divisionId: region.divisionId, regionId: region.id, districtId: d.id, managerId,
        territory: TERRITORIES[d.id]?.[i] ?? `${d.name} ${i + 1}`,
        hireDate: isPriya ? "2022-02-07" : `${2026 - tenure}-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-15`,
        active: true,
      });
    }
  }

  const courses = seedCourses();
  const lumora = courses.find((c) => c.id === "c-lumora-launch")!;
  const reps = users.filter((u) => u.roles.includes("rep"));
  const progress: Progress[] = [];

  /* ── Default courses ── */
  for (const u of reps) {
    const certified = r() > 0.04;
    progress.push(defaultProgress(u.id, "c-compliance", 3, certified, "2026-01-12"));
    if (u.divisionId === "div-imm") progress.push(defaultProgress(u.id, "c-ad101", 2, u.id === "u-priya" ? false : r() > 0.08, "2026-03-04"));
  }
  /* Cardexa v1: 46 of 48 certified. */
  reps.filter((u) => u.divisionId === "div-cm").forEach((u, i) => {
    progress.push(defaultProgress(u.id, "c-cardexa", 1, i % 24 !== 5, "2025-11-20"));
  });

  /* ── Lumora launch readiness campaign: 180 Immunology reps ── */
  const certifiedTarget: Record<string, number> = { "reg-east": 26, "reg-central": 24, "reg-south": 23, "reg-west": 31 };
  const regionOffset: Record<string, number> = { "reg-east": 3, "reg-central": -2, "reg-south": -5, "reg-west": 4 };
  const latestBase: Record<string, number> = {
    "c-disease": 86, "c-moa": 84, "c-efficacy": 80, "c-dosing": 79, "c-safety": 82, "c-competitive": 68,
    "c-access": 53, "c-opening": 75, "c-objections": 70, "c-compliance": 86,
  };
  const clamp = (n: number) => Math.max(18, Math.min(100, Math.round(n)));

  for (const regionId of Object.keys(certifiedTarget)) {
    const regionReps = reps.filter((u) => u.regionId === regionId && u.id !== "u-priya");
    let certLeft = certifiedTarget[regionId];
    regionReps.forEach((u, idx) => {
      const isNE = u.districtId === "d-northeast";
      const neIdx = isNE ? Number(u.id.split("-").pop()) : -1;
      const assignedAt = "2026-09-15";
      const dueAt = day(assignedAt, 48 + Math.floor(r() * 42)); // individual due dates early Nov–mid Dec
      const latest: Record<string, number> = {};
      const screen: Record<string, number> = {};
      /* Real cohorts are uneven: most improve by varying amounts, about one in eight is flat or slips. */
      const gain = r() < 0.12 ? -2 - r() * 6 : 6 + r() * 34;
      for (const c of COMPETENCIES) {
        latest[c.id] = clamp(latestBase[c.id] + regionOffset[regionId] + (r() - 0.5) * 18);
        screen[c.id] = clamp(latest[c.id] - gain + (r() - 0.5) * 12);
      }
      const p: Progress = {
        id: `p-${u.id}-lum`, userId: u.id, courseId: "c-lumora-launch", version: 1, state: "not_started",
        assignedAt, dueAt, assignType: "required", campaignId: "cmp-lumora", completedBlocks: [], minutesSpent: 0, attempts: [], coachingNotes: [],
      };

      /* Northeast is hand-placed so David's queue tells a story. */
      let kind: "certified" | "verify_old" | "verify_new" | "learning" | "assessment" | "screening" | "not_started" | "coaching";
      if (isNE) {
        kind = (["certified", "certified", "verify_new", "verify_old", "certified", "learning", "screening", "certified"] as const)[neIdx - 1] ?? "certified";
        if (kind === "certified") certLeft--;
      } else if (certLeft > 0 && r() < certLeft / Math.max(1, regionReps.length - idx)) {
        kind = "certified";
        certLeft--;
      } else {
        const roll = r();
        kind = roll < 0.12 ? "verify_old" : roll < 0.2 ? "verify_new" : roll < 0.5 ? "learning" : roll < 0.62 ? "assessment" : roll < 0.7 ? "coaching" : roll < 0.82 ? "screening" : "not_started";
      }
      if (regionId !== "reg-south" && regionId !== "reg-central" && kind === "verify_old" && !isNE) kind = "verify_new";
      /* v1-hidden: no manager sign-off in v1, so passing the assessment certifies, and nobody is sent back for coaching. */
      /* Those who were waiting for sign-off passed recently, so they certify on their pass dates: that keeps this week busy. */
      const recentPass = kind === "verify_old" ? "2026-10-29" : kind === "verify_new" ? "2026-11-04" : undefined;
      kind = (["verify_old", "verify_new", "coaching"] as string[]).includes(kind) ? "certified" : kind;

      const latestOverall = Math.round(Object.values(latest).reduce((a, b) => a + b, 0) / COMPETENCIES.length);
      const passOverall = Math.max(80 + Math.round(r() * 9), Math.min(latestOverall, 97));
      if (kind !== "not_started") {
        const startedAt = day(assignedAt, 2 + Math.floor(r() * 20));
        p.startedAt = startedAt;
        if (kind !== "screening") {
          /* Reps who slipped really did score lower at the end than at screening. */
          const screenOverall = gain < 0 ? passOverall + 2 + Math.round(r() * 5) : Math.round(Object.values(screen).reduce((a, b) => a + b, 0) / COMPETENCIES.length);
          p.screening = { at: startedAt, overall: screenOverall, scores: screen };
          p.path = buildPath(lumora.modules, screen, "screening");
          p.path.builtAt = startedAt;
          const pathBlocks = lumora.modules.filter((m) => p.path!.moduleIds.includes(m.id)).flatMap((m) => m.blocks.map((b) => b.id));
          const done = kind === "learning" ? pathBlocks.slice(0, Math.floor(pathBlocks.length * (0.2 + r() * 0.6))) : pathBlocks;
          p.completedBlocks = done;
          p.minutesSpent = Math.round(done.length * 2.6);
          p.state = "learning";
        } else {
          p.state = "screening";
        }
        if (["certified", "verify_old", "verify_new", "assessment", "coaching"].includes(kind)) {
          const overall = latestOverall;
          const firstFail = r() < 0.24;
          /* Reps waiting on their manager passed on the day they asked for verification. */
          const attemptAt = recentPass ?? day(startedAt, 10 + Math.floor(r() * 10));
          if (firstFail) {
            p.attempts.push(mkAttempt(day(attemptAt, -4), Math.min(76, overall - 8), false, latest, ["c-access"]));
          }
          if (kind === "assessment") {
            /* About half sat the final and missed: a real cohort has people on a retake path. */
            if (!firstFail && r() < 0.6) {
              const weak = Object.entries(latest).sort((a, b) => a[1] - b[1])[0][0];
              p.attempts.push(mkAttempt(day("2026-10-31", Math.floor(r() * 6)), Math.min(77, overall - 6), false, latest, [weak]));
              p.state = "remediation";
            } else {
              p.state = firstFail ? "remediation" : "assessment";
            }
          } else {
            p.attempts.push(mkAttempt(attemptAt, passOverall, true, latest, []));
            if (kind === "certified") {
              const at = recentPass ? day(attemptAt, 1) : day(attemptAt, 1 + Math.floor(r() * 3));
              // v1-hidden: p.verify = { status: "approved", requestedAt: attemptAt, by: u.managerId, at };
              p.state = "certified";
              p.certifiedAt = at;
              p.certExpiresAt = day(at, 365);
              p.attestedAt = attemptAt;
              p.attestName = u.name;
            } else if (kind === "coaching") {
              p.verify = { status: "needs_coaching", requestedAt: attemptAt, by: u.managerId, at: day(attemptAt, 2), note: "Good energy. Your safety statement came late and was rushed; lead with balance when you share the EASI data.", focus: ["c-safety"] };
              p.state = "needs_coaching";
            } else {
              p.verify = { status: "pending", requestedAt: attemptAt };
              p.state = "awaiting_verify";
              p.attestedAt = attemptAt;
              p.attestName = u.name;
            }
          }
        }
      }
      progress.push(p);
    });
  }

  /* Priya transferred into Immunology recently: AD 101 is her unfinished foundation, so Lumora screening is still locked. */
  const pAd = progress.find((x) => x.userId === "u-priya" && x.courseId === "c-ad101")!;
  Object.assign(pAd, {
    assignedAt: "2026-10-27", dueAt: "2026-11-17", startedAt: "2026-10-29", minutesSpent: 7,
    path: { kind: "full", moduleIds: ["ad1", "ad2", "ad3"], reasons: { ad1: "Full course", ad2: "Full course", ad3: "Full course" }, testedOut: [], builtAt: "2026-10-29" },
    completedBlocks: ["ad1-b1", "ad1-b2"],
  });

  /* Priya starts fresh on Lumora: assigned this week. */
  progress.push({
    id: "p-u-priya-lum", userId: "u-priya", courseId: "c-lumora-launch", version: 1, state: "not_started",
    assignedAt: "2026-11-03", dueAt: "2026-11-24", assignType: "required", campaignId: "cmp-lumora",
    completedBlocks: [], minutesSpent: 0, attempts: [], coachingNotes: [],
  });

  /* And the short-form version, recommended alongside it for a few minutes a day. */
  progress.push({
    id: "p-u-priya-lumshort", userId: "u-priya", courseId: "c-lumora-short", version: 1, state: "not_started",
    assignedAt: "2026-11-05", dueAt: "2026-11-20", assignType: "recommended",
    completedBlocks: [], minutesSpent: 0, attempts: [], coachingNotes: [],
  });

  /* ── Lumora field kit (direct from sources): Northeast reps, at every stage of the direct journey ── */
  const kit = courses.find((c) => c.id === "c-fieldkit")!;
  const kitBlocks = kit.modules.map((m) => m.blocks[0].id);
  /* A screening call: its scores decide which files the rep skips. */
  const kitScreen = (at: string, opening: number, objections: number) => {
    const scores = { "c-opening": opening, "c-objections": objections };
    const path = buildPath(kit.modules, scores, "screening");
    return { screening: { at, overall: Math.round((opening + objections) / 2), scores }, path, pathBlocks: kit.modules.filter((m) => path.moduleIds.includes(m.id)).map((m) => m.blocks[0].id) };
  };
  const kitCall = (at: string, score: number, passed: boolean): Attempt => ({
    at, quiz: 0, roleplay: score, overall: score, passed,
    competencyScores: { "c-opening": Math.min(100, score + 6), "c-objections": Math.max(0, score - 4) },
    failedCompetencies: passed ? [] : ["c-objections"], reason: passed ? undefined : `Roleplay ${score}% (needs 75%)`,
  });
  const kitRow = (userId: string, over: Partial<Progress>): Progress => ({
    id: `p-${userId}-fieldkit`, userId, courseId: "c-fieldkit", version: 1, state: "not_started",
    assignedAt: "2026-11-06", dueAt: "2026-12-06", assignType: "required",
    completedBlocks: [], minutesSpent: 0, attempts: [], coachingNotes: [], ...over,
  });
  /* Screened, then part of the way through the files that screening left in. */
  const kitLearning = (userId: string, at: string, opening: number, objections: number, filesDone: number): Progress => {
    const k = kitScreen(at, opening, objections);
    return kitRow(userId, { state: "learning", startedAt: at.slice(0, 10), screening: k.screening, path: k.path, completedBlocks: k.pathBlocks.slice(0, filesDone), minutesSpent: 5 + filesDone * 6 });
  };
  const ne = reps.filter((u) => u.districtId === "d-northeast");
  const s3 = kitScreen("2026-11-08T10:00:00", 84, 52);
  const s4 = kitScreen("2026-11-08T14:30:00", 58, 41);
  progress.push(
    /* Priya hasn't started: her first step is the screening call. */
    kitRow("u-priya", {}),
    /* Experienced reps assigned practice only: one hasn't started, one passed the call straight away. */
    kitRow(ne[1].id, { mode: "practice" }),
    kitRow(ne[2].id, { mode: "practice", state: "certified", startedAt: "2026-11-09", attempts: [kitCall("2026-11-09T15:20:00", 84, true)], certifiedAt: "2026-11-09", certExpiresAt: "2027-11-09", attestedAt: "2026-11-09", attestName: ne[2].name }),
    /* Learn + practice: a strong opener who tested out of two files and passed; one retaking after a missed call; the rest on their way. */
    kitRow(ne[3].id, { state: "certified", startedAt: "2026-11-08", screening: s3.screening, path: s3.path, completedBlocks: s3.pathBlocks, minutesSpent: 17, attempts: [kitCall("2026-11-10T11:00:00", 79, true)], certifiedAt: "2026-11-10", certExpiresAt: "2027-11-10", attestedAt: "2026-11-10", attestName: ne[3].name }),
    kitRow(ne[4].id, { state: "remediation", startedAt: "2026-11-08", screening: s4.screening, path: s4.path, completedBlocks: s4.pathBlocks, minutesSpent: 31, attempts: [kitCall("2026-11-11T09:40:00", 58, false)] }),
    ...ne.slice(5).map((u, i) => (i % 2 ? kitRow(u.id, {}) : kitLearning(u.id, `2026-11-${10 + i}T09:00:00`, 60 + i * 6, 45 + i * 4, 1 + (i % 2)))),
  );

  /* Priya's first months: a personalised skills course she was screened on, failed once, then passed. Her record shows the whole arc. */
  const skills = courses.find((c) => c.id === "c-skills")!;
  const pScreen = { "c-opening": 62, "c-objections": 41, "c-access": 38, "c-safety": 66, "c-compliance": 72 };
  const pSkills: Progress = {
    id: "p-u-priya-skills", userId: "u-priya", courseId: "c-skills", version: 1, state: "certified",
    assignedAt: "2026-05-04", dueAt: "2026-06-01", assignType: "required", startedAt: "2026-05-06",
    screening: { at: "2026-05-06", overall: 54, scores: pScreen },
    completedBlocks: [], minutesSpent: 74, coachingNotes: [],
    attempts: [
      mkAttempt("2026-05-20", 71, false, { "c-opening": 78, "c-objections": 64, "c-access": 58, "c-safety": 82, "c-compliance": 86 }, ["c-objections"]),
      mkAttempt("2026-05-27", 86, true, { "c-opening": 88, "c-objections": 84, "c-access": 79, "c-safety": 91, "c-compliance": 92 }, []),
    ],
    attestedAt: "2026-05-27", attestName: "Priya Shah", certifiedAt: "2026-05-28", certExpiresAt: "2027-05-28",
  };
  pSkills.path = buildPath(skills.modules, pScreen, "screening");
  pSkills.path.builtAt = "2026-05-06";
  pSkills.completedBlocks = skills.modules.filter((m) => pSkills.path!.moduleIds.includes(m.id)).flatMap((m) => m.blocks.map((b) => b.id));
  progress.push(pSkills);
  /* She's working through AD 101 properly, and the compliance course is long done. */
  Object.assign(progress.find((x) => x.userId === "u-priya" && x.courseId === "c-compliance")!, { minutesSpent: 18 });

  /* A few reps picked up an open course from the Library this week. */
  const pickers = reps.filter((u) => u.divisionId === "div-imm" && u.id !== "u-priya").filter((_, i) => i % 41 === 7).slice(0, 3).map((u) => u.id);
  for (const [i, uid] of pickers.entries()) {
    progress.push({
      id: `p-${uid}-lob`, userId: uid, courseId: "c-lib-objections", version: 1, state: "learning",
      assignedAt: day("2026-11-02", i), assignType: "self", startedAt: day("2026-11-02", i), completedBlocks: [], minutesSpent: 6 + i * 4, attempts: [], coachingNotes: [],
    });
  }

  /* Managers learn too (MG-1 AC2). */
  progress.push({ ...defaultProgress("u-david", "c-compliance", 3, true, "2026-01-12") });
  progress.push({
    id: "p-u-david-lum", userId: "u-david", courseId: "c-lumora-launch", version: 1, state: "learning",
    assignedAt: "2026-09-15", dueAt: "2026-12-18", assignType: "required", campaignId: "cmp-lumora", startedAt: "2026-09-20",
    screening: { at: "2026-09-20", overall: 74, scores: { "c-disease": 92, "c-moa": 88, "c-efficacy": 81, "c-dosing": 70, "c-safety": 76, "c-competitive": 80, "c-access": 61, "c-opening": 90, "c-objections": 84, "c-compliance": 88 } },
    completedBlocks: ["lm6-b1", "lm6-b2", "lm6-b3", "lm8-b1"], minutesSpent: 22, attempts: [], coachingNotes: [],
  });
  const dp = progress.find((p) => p.id === "p-u-david-lum")!;
  dp.path = buildPath(lumora.modules, dp.screening!.scores, "screening");

  const campaigns: Campaign[] = [
    {
      id: "cmp-lumora", name: "Lumora launch readiness", type: "launch", courseIds: ["c-lumora-launch"],
      audience: { divisionIds: ["div-imm"], regionIds: [], districtIds: [], roles: ["rep"], userIds: [] },
      startAt: "2026-09-15", dueAt: "2026-12-18", target: 90, ownerId: "u-maya", status: "active",
    },
    {
      id: "cmp-annual", name: "2027 annual compliance recertification", type: "annual", courseIds: ["c-compliance"],
      audience: { divisionIds: [], regionIds: [], districtIds: [], roles: ["rep", "manager"], userIds: [] },
      startAt: "2027-01-04", dueAt: "2027-01-29", target: 100, ownerId: "u-maya", status: "scheduled",
    },
  ];

  const practice: PracticeSession[] = [
    {
      id: "ps-priya-1", userId: "u-priya", at: "2026-11-02T18:40:00", kind: "quiz", title: "Quick quiz · Lumora", quizScore: 60,
      deletesAt: "2026-12-02",
    },
  ];

  const notifications: Notification[] = [
    { id: "n1", userId: "u-priya", at: "2026-11-03T08:00:00", title: "New required course", body: "Lumora launch readiness is due 24 Nov.", href: "/rep/course/c-lumora-launch", read: false },
    { id: "n2", userId: "u-david", at: "2026-11-04T10:12:00", title: "Waiting for your sign-off", body: "2 reps passed Lumora launch readiness and need verification.", href: "/manager/verify", read: false },
    { id: "n3", userId: "u-maya", at: "2026-11-04T16:30:00", title: "MLR changes requested", body: "Cardexa label update 2026 v2 came back with 4 comments.", href: "/trainer/courses/c-cardexa/review", read: false },
    { id: "n4", userId: "u-maya", at: "2026-11-05T09:00:00", title: "Approval expiring", body: "Cardexa v1 (CDX-US-0412) expires in 13 days.", href: "/trainer/courses/c-cardexa/review", read: true },
  ];

  /* Keep every record internally consistent: a certified course has all its blocks done, someone
     part-way through has done the blocks their minutes add up to, and minutes never undercount the work. */
  for (const p of progress) {
    const c = courses.find((x) => x.id === p.courseId);
    if (!c) continue;
    const mods = c.versions.find((v) => v.version === p.version)?.modules.length ? c.versions.find((v) => v.version === p.version)!.modules : c.modules;
    const inPath = mods.filter((m) => !p.path || p.path.moduleIds.includes(m.id)).flatMap((m) => m.blocks);
    if (p.state === "certified" && p.completedBlocks.length === 0) p.completedBlocks = inPath.map((b) => b.id);
    if (p.state === "learning" && p.completedBlocks.length === 0 && p.minutesSpent > 0) {
      let sum = 0;
      for (const b of inPath) { if (sum >= p.minutesSpent || p.completedBlocks.length >= inPath.length - 1) break; p.completedBlocks.push(b.id); sum += b.minutes; }
    }
    const done = inPath.filter((b) => p.completedBlocks.includes(b.id)).reduce((a, b) => a + b.minutes, 0);
    p.minutesSpent = Math.max(p.minutesSpent, done);
  }

  return { users, districts, courses, progress, campaigns, practice, notifications };
}

function defaultProgress(userId: string, courseId: string, version: number, certified: boolean, publishedAt: string): Progress {
  const assignedAt = publishedAt;
  const done = certified;
  return {
    id: `p-${userId}-${courseId}`, userId, courseId, version, state: done ? "certified" : "learning",
    assignedAt, dueAt: day(assignedAt, 30), assignType: "default",
    startedAt: day(assignedAt, 3), completedBlocks: [], minutesSpent: done ? 16 : 6, attempts: [], coachingNotes: [],
    ...(done ? { certifiedAt: day(assignedAt, 9), certExpiresAt: day(assignedAt, 374), attestedAt: day(assignedAt, 9), attestName: "on file" } : {}),
  };
}

function mkAttempt(at: string, overall: number, passed: boolean, scores: Record<string, number>, failed: string[]): Attempt {
  const s = { ...scores };
  for (const f of failed) s[f] = Math.min(s[f], 48);
  return {
    at, quiz: overall, roleplay: passed ? Math.max(76, overall - 2) : overall - 6, overall, passed,
    competencyScores: s, failedCompetencies: failed,
    reason: passed ? undefined : "Below 70 on a critical competency",
  };
}

/** Anonymous practice aggregates for the trainer/manager pulse (PRD TH-7). Counts only. */
export const PRACTICE_AGGREGATE = {
  sessionsThisWeek: 412,
  practisingReps: 96,
  /* Share of practice calls taken with live prompts on (assisted mode). */
  assistedShare: 58,
  weekly: [118, 164, 201, 247, 290, 338, 371, 412],
  missed: [
    { criterion: "Handles the cost & access objection", hit: 41 },
    { criterion: "Delivers key safety information", hit: 63 },
    { criterion: "Opens with a relevant patient type", hit: 68 },
    { criterion: "Asks for a next step", hit: 71 },
  ],
  topScenarios: [
    { title: "Dr. Marcus Kim · follow-up call", sessions: 188 },
    { title: "Prep for a meeting · cost-focused dermatologist", sessions: 121 },
    { title: "Quick quiz · dosing", sessions: 64 },
  ],
};
