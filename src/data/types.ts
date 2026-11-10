/* Domain model for the Academy prototype. Mirrors PRD §3 (core concepts). */

export type Role = "trainer" | "manager" | "rep" | "admin";

export type DomainId =
  | "disease" | "clinical" | "safety" | "competitive" | "access" | "conversation" | "compliance";

export interface Domain { id: DomainId; name: string; short: string }

export interface Competency {
  id: string;
  name: string;
  domain: DomainId;
  description: string;
}

export interface Division { id: string; name: string; therapyArea: string }
export interface Region { id: string; name: string; divisionId: string }
export interface District { id: string; name: string; regionId: string; managerId: string }

export interface User {
  id: string;
  name: string;
  first: string;
  initials: string;
  email: string;
  roles: Role[];
  title: string;
  divisionId?: string;
  regionId?: string;
  districtId?: string;
  territory?: string;
  managerId?: string;
  hireDate: string;
  active: boolean;
}

export interface Indication {
  short: string;
  full: string;
  therapyAreas: string[];
  /** Variants that carry this indication. Empty means all of them. */
  variants?: string[];
  isNew?: boolean;
}

export interface Product {
  id: string;
  brand: string;
  generic: string;
  divisionId: string;
  /** Primary therapy area; `therapyAreas` holds all of them. */
  therapyArea: string;
  therapyAreas: string[];
  form: string;
  variants: string[];
  indications: Indication[];
  piSourceId: string;
  status: "Marketed" | "Launch" | "Awaiting approval";
  gradient: string;
}

export type SourceType =
  | "Prescribing Information" | "Visual aid" | "Clinical summary" | "Objection handler" | "Payer guide" | "Policy" | "Uploaded file";

export type FileFormat = "pdf" | "slides" | "doc" | "video" | "audio" | "data" | "image" | "other";

export interface Source {
  id: string;
  title: string;
  type: SourceType;
  pages: number;
  docNumber?: string;
  productId?: string;
  /** Files the trainer uploaded themselves. They have no MLR doc number until they're approved. */
  uploaded?: { fileName: string; format: FileFormat; at: string };
}

export interface Citation { sourceId: string; page: number }

export interface Para { text: string; cite?: Citation; missing?: boolean }

export type BlockType = "lesson" | "keypoints" | "flashcards" | "check" | "video" | "document" | "visualaid" | "audio" | "graphic" | "scenario";

/** A short video. Captions are the approved script; scenes drive the simulated picture in the prototype. */
export interface VideoSpec {
  durationSec: number;
  origin: "upload" | "ai" | "clip";
  chapters: { at: number; title: string }[];
  captions: { at: number; text: string }[];
  scenes: { at: number; headline: string; sub?: string; stat?: string }[];
  clipOf?: { blockId: string; from: number; to: number; title: string };
  fileName?: string;
}

/** Assigned pages of an approved PDF, read in-app. */
export interface DocumentSpec { sourceId: string; pages: number[]; callouts: { page: number; text: string }[] }

/** The approved visual aid, page by page, with what to say. */
export interface VisualAidSpec { sourceId: string; pages: { page: number; say: string; avoid?: string }[] }

/** An approved one-page infographic. */
export interface GraphicSpec { headline: string; stats: { value: string; label: string }[]; points: string[]; footnote?: string; sourceId?: string }

/** Approved text read aloud (text-to-speech). Same words, so nothing new to approve. */
export interface AudioSpec { fromBlockIds: string[]; durationSec: number }

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  minutes: number;
  competencies: string[];
  paragraphs?: Para[];
  points?: Para[];
  cards?: { front: string; back: string; cite?: Citation }[];
  check?: { question: string; options: string[]; answer: number; rationale: string; cite?: Citation };
  video?: VideoSpec;
  document?: DocumentSpec;
  visualaid?: VisualAidSpec;
  audio?: AudioSpec;
  graphic?: GraphicSpec;
  scenarioId?: string;
}

export interface Module {
  id: string;
  title: string;
  summary: string;
  competency: string;
  /** core = taught to anyone below proficient; reinforcement = only below 50. */
  tier: "core" | "reinforcement";
  required?: boolean;
  minutes: number;
  blocks: Block[];
}

export type Pool = "screening" | "assessment" | "practice";

export interface Item {
  id: string;
  competency: string;
  pool: Pool;
  /** The module this question tests. Without it, the first module that teaches its competency. */
  moduleId?: string;
  difficulty: 1 | 2 | 3;
  question: string;
  options: string[];
  answer: number;
  rationale: string;
  cite?: Citation;
}

export interface RubricCriterion {
  id: string;
  label: string;
  competency: string;
  weight: number;
  keywords: string[];
  good: string;
}

export interface ProhibitedRule {
  id: string;
  label: string;
  keywords: string[];
  /** If any of these appear in the same turn, the hit is treated as a correct refusal. */
  negations?: string[];
  critical: boolean;
  explanation: string;
  approvedRef?: { moduleId: string; label: string };
}

export interface Objection {
  id: string;
  label: string;
  competency: string;
  line: string;
  pushback: string;
  handled: string;
  keywords: string[];
}

export interface Persona {
  name: string;
  specialty: string;
  setting: string;
  traits: string[];
  opening: string;
  closing: string;
}

export interface Scenario {
  id: string;
  courseId: string;
  title: string;
  persona: Persona;
  context: string;
  objective: string;
  durationMin: number;
  objectionIds: string[];
  rubric: RubricCriterion[];
  prohibitedIds: string[];
  behaviourNote: string;
  use: ("screening" | "assessment" | "practice")[];
}

export type VersionState =
  | "draft" | "ready" | "in_review" | "changes" | "approved" | "published"
  | "expired" | "withdrawn" | "superseded";

export interface MlrComment { id: string; text: string; resolved: boolean; moduleId?: string }

export interface HistoryEntry { at: string; by: string; action: string; note?: string }

export interface CourseVersion {
  version: number;
  versionId: string;
  state: VersionState;
  docNumber?: string;
  approvedAt?: string;
  expiresAt?: string;
  submittedAt?: string;
  vaultId?: string;
  publishedAt?: string;
  packageAt?: string;
  transition?: "minor" | "recertify" | "restart";
  comments: MlrComment[];
  acknowledged: string[];
  history: HistoryEntry[];
  /** Snapshot of the content this version was approved on (published versions only). */
  modules: Module[];
}

export interface CourseSettings {
  screening: boolean;
  screeningCall: boolean;
  screeningScenarioId?: string;
  screeningItems: number;
  assessmentItems: number;
  assessmentCall: boolean;
  assessmentScenarioId?: string;
  passOverall: number;
  passCritical: number;
  passRoleplay: number;
  criticalCompetencies: string[];
  attempts: number;
  cooldownHours: number;
  verify: "auto" | "manager";
  recertMonths: number;
  attestation: string;
  completion: { path: boolean; assessment: boolean; verify: boolean; attestation: boolean; checks: number };
}

export interface Course {
  id: string;
  title: string;
  productId?: string;
  format: "long" | "short";
  type: "personalised" | "linear";
  objective: string;
  audience: string;
  sourceIds: string[];
  competencyIds: string[];
  /** Working copy. Equals the latest version's modules unless a draft is open. */
  modules: Module[];
  items: Item[];
  scenarioIds: string[];
  settings: CourseSettings;
  versions: CourseVersion[];
  ownerId: string;
  updatedAt: string;
  defaultFor?: string;
  /** The product scope picked at creation: variants, indications (short names) and therapy areas. Empty means all. */
  scope?: { variants: string[]; indications: string[]; therapyAreas: string[] };
  /** For company courses without a product: the division whose reps see it in the Library. */
  divisionId?: string;
  /** Who the content is written for; sets depth and tone. */
  writtenFor?: "reps" | "new_hires" | "managers";
  /** Field teams (division ids) it's meant for. Empty means everyone. Drives Library visibility and the default when assigning. */
  teams?: string[];
  /** Library visibility: assigned only, matching audience (division of the product), or everyone. */
  visibility: LibraryVisibility;
  /** Courses that must be certified before screening unlocks. */
  prerequisites: string[];
  /** Reps may open any module without starting for credit. */
  allowExplore: boolean;
}

export type LibraryVisibility = "assigned" | "audience" | "everyone";

/** A standalone Library item: an approved piece published on its own, or a playlist of approved blocks. */
export interface Material {
  id: string;
  kind: "playlist" | "graphic" | "reading" | "visualaid";
  title: string;
  description: string;
  productId?: string;
  visibility: LibraryVisibility;
  block?: Block;
  items?: { courseId: string; blockId: string }[];
  docNumber?: string;
  expiresAt?: string;
  createdAt: string;
  ownerId: string;
}

export type ProgressState =
  | "not_started" | "screening" | "learning" | "assessment" | "remediation"
  | "awaiting_verify" | "needs_coaching" | "certified";

export interface RoleplayResult {
  transcript: Turn[];
  criteria: { id: string; label: string; met: boolean; at?: number; quote?: string }[];
  flags: { ruleId: string; label: string; critical: boolean; quote: string; at: number; explanation: string }[];
  score: number;
  typed: boolean;
  durationSec: number;
}

export interface Turn { speaker: "hcp" | "rep"; text: string; at: number }

export interface Attempt {
  at: string;
  quiz: number;
  roleplay?: number;
  overall: number;
  passed: boolean;
  competencyScores: Record<string, number>;
  failedCompetencies: string[];
  call?: RoleplayResult;
  reason?: string;
}

export interface PathPlan {
  kind: "screening" | "remediation" | "full";
  moduleIds: string[];
  reasons: Record<string, string>;
  testedOut: string[];
  builtAt: string;
}

export interface Progress {
  id: string;
  userId: string;
  courseId: string;
  version: number;
  state: ProgressState;
  assignedAt: string;
  /** Assigned now, but the rep can't start until this day. */
  startsAt?: string;
  dueAt?: string;
  assignType: "default" | "required" | "recommended" | "self";
  campaignId?: string;
  startedAt?: string;
  screening?: { at: string; overall: number; scores: Record<string, number>; call?: RoleplayResult };
  path?: PathPlan;
  completedBlocks: string[];
  minutesSpent: number;
  attempts: Attempt[];
  verify?: {
    status: "pending" | "approved" | "needs_coaching";
    requestedAt: string;
    by?: string;
    at?: string;
    note?: string;
    focus?: string[];
    delegate?: boolean;
  };
  certifiedAt?: string;
  certExpiresAt?: string;
  attestedAt?: string;
  attestName?: string;
  coachingNotes: { at: string; by: string; text: string }[];
}

export interface Campaign {
  id: string;
  name: string;
  type: "launch" | "label_update" | "onboarding" | "annual";
  courseIds: string[];
  audience: AudienceRules;
  startAt: string;
  dueAt: string;
  target: number;
  ownerId: string;
  status: "active" | "scheduled" | "closed";
}

export interface AudienceRules {
  divisionIds: string[];
  regionIds: string[];
  districtIds: string[];
  roles: Role[];
  hiredWithinDays?: number;
  userIds: string[];
}

export interface PracticeSession {
  id: string;
  userId: string;
  at: string;
  kind: "roleplay" | "quiz";
  title: string;
  setup?: { specialty: string; traits: string[]; objectionIds: string[]; callType: string };
  result?: RoleplayResult;
  quizScore?: number;
  shared?: { at: string; seen: boolean };
  deletesAt: string;
}

export interface TrainingEvent {
  id: string;
  at: string;
  userId: string;
  courseId: string;
  version: number;
  type:
    | "assigned" | "started" | "screening_completed" | "path_generated" | "block_completed"
    | "assessment_attempt" | "verify_requested" | "verify_decision" | "attested" | "certified"
    | "version_expired" | "nudged" | "coaching_note";
  detail: string;
  by?: string;
}

export interface Notification {
  id: string;
  userId: string;
  at: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
}
