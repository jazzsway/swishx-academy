# SwishX Academy — Product Requirements Document

| | |
|---|---|
| **Status** | Draft v0.1 for review |
| **Owner** | Shreyans Jaiswal |
| **Date** | 2026-11-06 |
| **Inputs** | Founder brief · [Research brief](01-research-brief.md) · Decisions locked 2026-11-06 |
| **Next** | Review → screen flows & mockups → frontend-only prototype (no backend) |

---

## 1. Overview

### 1.1 One-liner
SwishX Academy is an AI-powered training academy for pharma and life-sciences field forces. Trainers turn approved product material into MLR-approved courses in hours instead of weeks. Every rep gets a personalised path built only from that approved content. Trainers and managers get real-time proof that the field is ready.

### 1.2 Problem
- **Trainers are slow and blind.** Building a course from the PI, visual aid and clinical data takes weeks. MLR adds weeks more. Once it's live, trainers see completions and quiz scores, not whether reps can actually have the conversation. Proving impact is the top unsolved problem in pharma L&D (LTEN 2024–25).
- **Reps get one-size-fits-all training.** A 10-year dermatology rep and a new hire sit through the same 90 minutes. Time out of the field is expensive, and boredom kills retention.
- **Managers can't see readiness.** Before a launch or after a label change, a district manager can't easily answer "who on my team is ready to detail?"
- **Personalisation and compliance pull in opposite directions.** Every word a rep learns about a product must be MLR-approved. Generic AI tutors that write new text per learner can't be used in US pharma.

### 1.3 Our answer
1. **AI course authoring from approved sources.** The trainer gives an objective and sources. AI drafts the course, the assessments and the roleplay scenarios, every line cited to a source. The trainer refines it in chat.
2. **An MLR-locked block model.** A course is made of small approved blocks. After approval, AI personalises only by **picking and ordering** approved blocks; it never writes new product content for a rep.
3. **Screening → personalised path → assessment → verify → loop.** Reps skip what they already know and spend their time on their gaps.
4. **Private practice.** Unlimited, pressure-free AI roleplay and quizzes. Nobody sees an individual's sessions.
5. **Proof of progress.** The trainer home opens on readiness, screening-to-final lift, competency gaps and content health.

### 1.4 Goals (v1)
- G1. A trainer can go from sources to a review-ready course in **under one working day**.
- G2. A rep can go from assignment to certified, with time spent proportional to their gaps.
- G3. A trainer or manager can answer "who is ready, on what, and how much did they improve?" in **under one minute**.
- G4. Every rep-facing word and every score is traceable to an approved course version.
- G5. Reps come back voluntarily (practice, streaks), not just when training is due.

### 1.5 Non-goals (v1)
- A backend or production infrastructure. v1 of this effort is a **frontend-only prototype** with mock data.
- Enterprise integrations: SSO/SCIM, LMS sync (xAPI/SCORM), the Veeva Vault API, CRM/sales data. Designed for, built later.
- Compliance training that isn't sales training (e.g. GxP SOP training, HR courses).
- Medical affairs / MSL training (non-promotional content). The data model must not block it later.
- Native mobile apps. Responsive web, rep screens mobile-first.
- Paid rewards or any link to incentive compensation.

### 1.6 Product principles
1. **Approved or it doesn't reach a rep.** No unapproved product content in any rep-facing surface. Practice AI feedback is coaching, not content (§10).
2. **Analytics first for the trainer.** The trainer lands on what's happening and what needs action, not on a content list.
3. **Respect the rep's time.** Every minute of training should close a measured gap.
4. **Private practice means private.** No individual practice data shown to anyone but the rep, ever.
5. **Sober where it matters.** Gamify learning, never compliance attestations or safety content.
6. **Show the version.** Every course, record and certificate names the approved version and document number.

---

## 2. Users and roles

### 2.1 Personas

**Maya Chen — Commercial Training Lead (Trainer, primary)**
- Emerging biotech, 1–3 person training team, supports ~180 reps across 2 brands. Former rep, now owns onboarding, launch readiness and label-update training.
- **Jobs:**
  - build and update courses fast
  - get them through MLR
  - make sure every rep is certified before a launch or deadline
  - prove to the VP of Sales that training worked
- **Pains:** weeks per course; MLR back-and-forth; Excel tracking; no view of real skill, only completion.
- **Success:** "I launched the training two weeks earlier, and I can show leadership 94% certified with a 31-point lift."

**David Ortiz — District Manager (Sales manager)**
- Leads 8–12 reps in the Northeast district. Is measured on team performance, and is also a learner (managers get certified too).
- **Jobs:** know who's ready, coach the gaps, sign off on pitches when required, chase overdue reps.
- **Pains:** no time; hears about gaps only from ride-alongs; certification sign-off means watching long videos.
- **Success:** "In 10 minutes on Monday I know who needs me this week, and I can sign off pitches from my phone."

**Priya Shah — Dermatology Specialty Rep (Field rep)**
- 4 years in derm, new to the company's launch brand. Learns on her phone or iPad between calls and in the car before meetings.
- **Jobs:** be ready for her HCP conversations, pass certification, not waste time on what she knows.
- **Pains:** long generic modules; being judged on every practice attempt; can't prep for a specific tough doctor.
- **Success:** "It skipped what I knew, I practised the Dr. Kim objection five times privately, and I passed first try."

### 2.2 Roles (v1)

| Role | Scope | Can do |
|---|---|---|
| **Admin** | Whole organisation | Users, org structure, products, competency framework, settings. Can also hold the Trainer role. |
| **Trainer** | Assigned brands/divisions (or all) | Create/edit courses, manage MLR status, assign, run campaigns, see analytics and records for their scope, verify on a manager's behalf. |
| **Manager** | Their team, plus teams below them in the hierarchy | Team dashboard, verify (sign off) reps, coaching notes, nudge, assign published courses to their team (if the trainer allows), own learning. |
| **Rep** | Self | Learn, screening, assessments, practice, certificates, own records. |

A person can hold more than one role (e.g. Manager + learner, Admin + Trainer). Access belongs to the role; there are no per-person overrides.

**Later roles:** Compliance auditor (read-only records and exports across the org); L&D head (Trainer with org-wide scope plus trainer-team analytics).

### 2.3 Permission matrix (v1)

| Capability | Admin | Trainer | Manager | Rep |
|---|---|---|---|---|
| Manage users & org structure | ✅ | — | — | — |
| Manage products, indications, competency framework | ✅ | View (suggest) | — | — |
| Create / edit courses | ✅* | ✅ (in scope) | — | — |
| Record MLR status / approve version in Academy | ✅* | ✅ | — | — |
| Assign courses / run campaigns | ✅* | ✅ | Own team, published courses only, if allowed | — |
| See analytics | Org | Scope | Own team | Own |
| See named rep results (screening, assessments, path) | ✅ | ✅ (scope) | ✅ (team) | Own |
| See named rep **practice** sessions | ❌ | ❌ | ❌ (only if the rep shares) | Own |
| See aggregate practice insights | ✅ | ✅ | ✅ (team ≥ 5 reps) | — |
| Verify / sign off | — | ✅ (as delegate) | ✅ (team) | — |
| Export training records | ✅ | ✅ (scope) | Team | Own |

\* Only when the Admin also holds the Trainer role.

---

## 3. Core concepts and glossary

| Term | Definition |
|---|---|
| **Organisation** | One client company (tenant). Everything is scoped to it. |
| **Org structure** | Division → Region → District (team) → Territory → User. Each user has a role, title, division, therapy areas, brands, manager and hire date. |
| **Product / Brand** | A marketed product, with its **indications** (exact approved wording plus a short name) and **therapy areas**. |
| **Competency framework** | The organisation's skills taxonomy. Domains → Competencies, e.g. *Label & Safety → Dosing & administration*. Every block, assessment item and rubric criterion is tagged to one or more competencies. |
| **Default domains** | Disease state · Product & clinical data · Label & safety · Competitive landscape · Access & reimbursement · HCP conversation skills · Compliance. |
| **Source** | A document the trainer uploads to build from: PI, approved visual aid, clinical reprint, objection handler, brand guide, data tables, video/transcript. Can carry its own PromoMats doc number. |
| **Course** | The main unit a trainer creates and MLR approves. Has an objective, audience, format (Long-form or Short), modules, an item bank, roleplay scenarios, and completion, assessment and verify settings. |
| **Module** | An ordered group of blocks within a course (e.g. "Mechanism of action"). |
| **Block** | The **smallest approved unit**: a lesson, key-point card, video, flashcard set, knowledge check or scenario brief. Tagged to competencies, cited to sources, and flagged *Required for everyone* or *Personalisable*. |
| **Item bank** | Assessment questions for a course. Each has an answer key, rationale, competency tag, difficulty and source citation, and is marked *Screening*, *Assessment* or *Practice* pool. |
| **Roleplay scenario** | A simulated HCP call: persona, setting, call objective, duration, objection pool and a scoring **rubric** (weighted criteria, required statements, prohibited language, pass mark). |
| **Course version** | An immutable snapshot of a course. Only **Approved** versions reach reps. Editing an approved course creates a new draft version. |
| **MLR package** | The export the trainer submits to PromoMats: all blocks, items with answer keys, scenarios, rubrics and the AI behaviour note, with citations and a change summary. Stamped with a version ID. |
| **Assignment** | A course given to an audience, with a type (Default / Required / Recommended) and an optional due date. |
| **Campaign** | A time-boxed assignment with a purpose: Launch readiness · Label update recertification · Onboarding · Annual recertification. |
| **Screening** | The per-course baseline: an adaptive quiz plus, optionally, a voice roleplay call ("call one"). Produces competency scores. |
| **Personalised path** | The rep's ordered subset of a course version's approved blocks, chosen from their screening (or assessment) gaps. |
| **Final assessment** | The graded test: quiz items from the assessment pool plus an optional roleplay, scored against pass criteria. |
| **Verify** | The readiness gate after passing: automatic, or with manager sign-off on the recorded roleplay (configured per course). |
| **Certification** | Proof that a rep is ready on a course version, with an issue date and a recertification date. |
| **Practice** | The rep's private, unlimited, ungraded sandbox (roleplay, quizzes, flashcards). Never part of the record. |
| **Training record** | An immutable event log per rep per course version: assignment, screening, path, time, attempts, verify, certification, attestations. |
| **Proficiency bands** | Per-competency score: **Not yet** (<50) · **Developing** (50–79) · **Proficient** (80–94) · **Expert** (95+). Thresholds are configurable per org. |

---

## 4. Lifecycles

### 4.1 Course version lifecycle

```
Draft ──► Ready for review ──► In MLR review ──► Approved ──► Published ──► Expiring soon ──► Expired
  ▲            │                    │                            │                              
  │            │                    ▼                            ├──► Withdrawn (any time)      
  └────────────┴──────────── Changes requested                   └──► Superseded (newer version published)
```

| State | Meaning | Who moves it | Rules |
|---|---|---|---|
| **Draft** | Being authored or edited | Trainer | Editable. Not visible to reps. |
| **Ready for review** | Guardrail checks pass; MLR package generated | Trainer | Blocked if any check is red (§10.2). Content frozen; editing returns it to Draft and voids the package. |
| **In MLR review** | Submitted in PromoMats outside Academy | Trainer marks "Submitted" (date, optional Vault document ID) | Content frozen. |
| **Changes requested** | MLR returned comments | Trainer records comments (paste or upload annotated PDF) | Back to editable. Comments stay attached as a checklist. The next package shows a change summary. |
| **Approved** | MLR approved this exact version | Trainer enters doc number, approval date, expiry date and uploads the approved PDF | The package's version ID must match (trainer confirms). Version locked forever. |
| **Published** | Live and assignable | Trainer publishes (can schedule) | Only approved versions can be published. |
| **Expiring soon** | Within 30 days of expiry (configurable) | System | Trainer is alerted at 30/14/7 days. |
| **Expired** | Past expiry date | System | Removed from rep paths; reps in progress see a notice. Certifications keep their history and are flagged "version expired". |
| **Withdrawn** | Pulled by the trainer (e.g. a label change) | Trainer, with a reason | Immediately removed from reps. Can trigger a recertification campaign. |
| **Superseded** | A newer version was published | System | Reps in progress follow the transition rule (§4.4). |

### 4.2 Rep progress on a course

```
Assigned ─► Screening ─► Learning (personalised path) ─► Assessment ─┬─► Passed ─► Awaiting verify ─┬─► Certified ─► Recert due
                │                                          ▲          │                              │
                └─ (screening off) ─► Learning (full)      │          └─► Not passed ─► Remediation path ┘ (Needs coaching)
                                                           └──────────────────────────────────────────┘
```

- **Default / linear courses** (screening off) take the full course in order.
- **Not passed** builds a remediation path from the failed competencies, then the rep retakes. The attempt limit and cooldown are set per course.
- **Needs coaching** (manager verify) does the same, plus the manager's coaching notes. The rep then resubmits a roleplay.
- **Certified** carries a recert date (course setting, e.g. 12 months) and is re-opened by campaigns.

### 4.3 Certification states
`Not started · In progress · Overdue · Passed – awaiting verify · Certified · Expiring · Lapsed (recert overdue) · Version withdrawn`

### 4.4 Version transition rules (rep in progress when a new version is published)
The trainer chooses one when publishing a new version:
1. **Minor update.** Progress carries over for unchanged blocks; only new or changed blocks are added to the rep's path. Existing certifications stay valid.
2. **Recertify.** Everyone assigned must recertify on the new version by a due date (creates a Label update recertification campaign).
3. **Restart.** Progress resets (rare; e.g. a major restructure).

Safety/label changes default to **Recertify**.

---

## 5. End-to-end journeys

### 5.1 Trainer: create, approve and launch a course
1. **Land on the home screen** with readiness, proof of progress and an action queue (§6, E1).
2. **Create a course:** objective → audience → format (Long-form / Short) → upload or select sources → competencies (AI suggests) → settings.
3. **AI drafts an outline** (modules with objectives and timings). The trainer edits it in chat or directly, then approves it.
4. **AI drafts the full course:** blocks with citations, item bank (screening/assessment/practice pools), roleplay scenarios and rubrics.
5. **Refine in chat:** "shorten module 2", "add 3 harder questions on renal dosing", "make Dr. Kim more sceptical". Each change shows a diff to accept or reject.
6. **Set criteria:** completion, screening, assessment pass marks, verify mode (auto or manager), attempts and recert interval.
7. **Preview as a rep:** simulate a strong and a weak screening and see the paths each would get.
8. **Run checks → Ready for review:** guardrails (uncited lines, unapproved indication, missing safety statements, superlatives) must be green. Generate the MLR package.
9. **Submit in PromoMats** (outside Academy) → mark *In MLR review*.
10. **MLR comes back.** *Changes requested*: record the comments, fix them via chat with the comments as a checklist, regenerate the package. Or *Approved*: enter the doc number and dates, upload the approved PDF, lock the version.
11. **Publish and assign:** audience rules (division, therapy area, brand, team, role, hire date), type (Default / Required / Recommended), due date, or launch it as a campaign.
12. **Monitor:** readiness by team, lift, stuck reps, failing items, pending verifications. Act: nudge, extend the due date, fix content (new version).

### 5.2 Rep: from first login to certified
1. **First login:** a short welcome, consent and notice for voice sessions, and a mic check.
2. **Home** shows *Up next*, due dates and **Default courses** auto-assigned by division, therapy area and team (e.g. *Compliance essentials*, *AD disease state 101*). Default courses with screening off run linear and complete.
3. **Start a personalised course** (e.g. *Lumora launch readiness*):
   - **Screening:** ~10-minute adaptive quiz, then a ~5-minute voice call with an AI HCP.
   - **Results:** a competency map (Not yet / Developing / Proficient / Expert) and "Your path: 6 of 14 modules, ~42 min. You tested out of 8."
4. **Learn the personalised path:** required-for-everyone blocks (e.g. safety) always included; gap blocks first-class; tested-out blocks available as optional "skim".
5. **Final assessment:** quiz plus a roleplay call. Instant score with a per-competency breakdown.
   - Fail → remediation path on the failed competencies → retake.
6. **Verify:**
   - Auto: certified immediately.
   - Manager sign-off: the recording goes to the manager → *Certified*, or *Needs coaching* with notes → targeted remediation → resubmit.
7. **Certified:** certificate (course, version, doc number, date, valid-until), badge, XP. Spaced reinforcement cards appear over the following weeks.
8. **Loop:** new assigned courses, recertification campaigns and label updates restart the cycle.

### 5.3 Rep: private practice (separate from the loop)
1. **Practice tab → choose one:**
   - **Prep for a meeting:** pick HCP specialty, persona type (e.g. "sceptical, data-driven, high-volume prescriber of competitor"), objective and expected objections.
   - **Scenario library:** approved scenarios from courses the rep is assigned.
   - **Quick quiz / Flashcards** from practice pools.
2. **AI roleplay by voice** (typed fallback). Ends with a private scorecard: strengths, misses, any off-label or unapproved statement flagged as coaching, and "what the approved material says" links.
3. **Repeat as often as they like.** Nothing is visible to the trainer or manager unless the rep taps **Share with my manager** on a session.
4. **Trainers and managers see** only anonymous aggregates: practice volume and the most-missed objections and competencies, shown only when the group has ≥ 5 reps.

### 5.4 Manager: weekly routine
1. **Home:** team readiness per required course, overdue reps, the verification queue, and a team competency heatmap.
2. **Verify queue:** play the recording at 1.5×, with the AI scorecard and timestamps of flagged moments → Approve, or Needs coaching (notes, focus competencies).
3. **Rep detail:** screening vs latest scores, path progress, attempts, coaching history (never practice).
4. **Act:** nudge, add a coaching note, assign a published course to the team (if allowed), and do their own learning.

---

## 6. Epics and user stories

Priority: **P0** = must be in the prototype · **P1** = prototype if time allows · **P2** = later (designed for, not built).
Acceptance criteria (AC) describe prototype behaviour with mock data unless stated otherwise.

### E1. Trainer home and analytics

**TH-1 (P0) Analytics-first landing.** As a trainer, I want to land on readiness and action items so that I know in a minute where to focus.
- AC1: Home shows, top to bottom: **Readiness** · **Proof of progress** · **Needs your action** · **Competency heatmap** · **Content health** · **Practice pulse**.
- AC2: A scope filter (brand, division, team, course, date range) applies to every widget and persists for the session.
- AC3: Every number is clickable through to the underlying list of reps, courses or items.
- AC4: Empty state for a new trainer: "Create your first course" with a 3-step explainer, no fake numbers.

**TH-2 (P0) Readiness.** As a trainer, I want to see what % of the assigned audience is certified per required course and campaign so that I can report launch readiness.
- AC1: Per course/campaign: Certified % · In progress · Not started · Overdue, with the due date and a trend line (last 8 weeks).
- AC2: Breakdown by region → district, sortable by lowest readiness.
- AC3: "Projected readiness by due date" based on the current pace (simple linear projection, labelled as an estimate).

**TH-3 (P0) Proof of progress.** As a trainer, I want to see how much reps improved from screening to final assessment so that I can prove training works.
- AC1: Per course: average screening score → average final score, the lift in points, and the % of reps who improved.
- AC2: Per competency: before/after bars.
- AC3: Time-to-certified (median days from assignment) and minutes saved by personalisation (full-course minutes − actual path minutes, summed).
- AC4: One-click **Export proof pack** (PDF/CSV) for leadership: readiness, lift, time saved, top gaps. (P1)

**TH-4 (P0) Needs your action queue.** As a trainer, I want one queue of things waiting on me.
- AC1: Item types: courses with MLR changes requested · approvals expiring in ≤ 30 days · courses ready to publish · reps overdue > N days · reps who failed the max attempts · verifications pending > 5 days (the manager hasn't acted) · items flagged by content health.
- AC2: Each item has a primary action (Open, Publish, Nudge, Extend, Verify as delegate) and can be snoozed for 7 days.

**TH-5 (P0) Competency heatmap.** As a trainer, I want team × competency proficiency so that I can see systemic gaps.
- AC1: Rows are teams (or reps when drilled in); columns are competencies; cells show the band colour plus the average score.
- AC2: Source toggle: latest screening vs latest assessment.
- AC3: Clicking a column opens "Reps not yet proficient" and the "Blocks that teach this" list.

**TH-6 (P1) Content health.** As a trainer, I want to see which questions and blocks underperform so that I can fix content.
- AC1: Items with < 40% correct, items with > 95% correct (too easy), most-skipped optional blocks, and blocks with the highest drop-off.
- AC2: Each links to the course editor at that item, with a "Fix in new version" action.

**TH-7 (P0) Practice pulse (aggregate).** As a trainer, I want anonymous practice trends so that I know what reps are worried about.
- AC1: Sessions this week, unique practising reps (count only), most-practised scenarios, the most-missed rubric criteria and the most-raised objections.
- AC2: Hidden for any slice with fewer than 5 reps ("Not enough data to keep this anonymous").
- AC3: No rep names, no transcripts, no per-rep counts anywhere on trainer screens.

**TH-8 (P1) Approval-to-practice time.** As a trainer, I want to see how fast approved content reaches reps.
- AC1: Per course version: approved date → published date → first rep start → 50% started.

### E2. Course creation with AI

**CC-1 (P0) Start a course.** As a trainer, I want a guided start so that AI has what it needs.
- AC1: Fields:
  - **Objective** (free text; AI suggests a rewrite as measurable outcomes)
  - **Product/brand** and **indications** (from the product library; exact approved wording shown)
  - **Audience** (role, division, therapy area, experience level)
  - **Format**: *Long-form* (multi-module, 30–120 min) or *Short* (micro, 5–15 min, 1–3 modules)
  - **Course type**: *Personalised* (screening on) or *Linear* (screening off, e.g. default/compliance courses)
- AC2: **Sources:** upload (PDF, PPTX, DOCX, MP4/transcript, CSV/XLSX) or pick from the Source library. Each source shows its type, page count and optional PromoMats doc number. **The PI is required** for any product course.
- AC3: **Competencies:** AI proposes 4–10 from the framework based on the objective and sources; the trainer adds or removes.
- AC4: "Create outline" stays disabled until the objective, product, at least one source and at least one competency are set.

**CC-2 (P0) AI outline.** As a trainer, I want to approve the structure before AI writes everything.
- AC1: The outline lists modules with a title, learning objectives, competencies, estimated minutes and the sources used.
- AC2: Edits: reorder (drag), rename, delete, add a module, or ask in chat ("split module 3 into efficacy and safety").
- AC3: "Generate course" creates all modules. A progress view shows modules filling in one at a time.

**CC-3 (P0) Generated course content.** As a trainer, I want a complete, cited draft.
- AC1: Each module contains blocks of these types: Lesson (rich text with images/tables), Key-point card, Video (uploaded or linked), Flashcards, Knowledge check (ungraded) and Scenario brief.
- AC2: **Every factual sentence carries a citation** (source + page/slide). Uncited sentences are underlined red as *No source*.
- AC3: Each block shows its competency tags, estimated time, and a toggle: **Required for everyone** vs **Personalisable**. AI pre-sets Required on safety/ISI, boxed warning, indication and compliance blocks; the trainer can't untoggle safety blocks.
- AC4: An item bank is generated per competency, at least 6 items per competency across pools (Screening / Assessment / Practice), each with an answer key, rationale and citation, and difficulty Easy/Medium/Hard.
- AC5: Roleplay scenarios are generated (at least one per course for Personalised courses), see AS-3.

**CC-4 (P0) Edit via chat.** As a trainer, I want to change the course by asking so that I don't hand-edit everything.
- AC1: A chat panel sits next to the editor. Requests can target the whole course, a module or the selected block or item.
- AC2: Every AI change shows as a **diff** (added/removed text) on the affected blocks, with Accept / Reject per change and Accept all.
- AC3: AI answers questions about the course ("which competencies have fewer than 6 assessment items?") without changing anything.
- AC4: AI may only use the course's sources. A request that needs information not in the sources is answered with "Not in your sources. Add a source that covers it."
- AC5: Direct editing is also available (rich text, drag to reorder blocks, duplicate, delete).
- AC6: Edits to a course in Ready for review or later move it back to Draft, after a confirmation that names the consequence (the package is voided).

**CC-5 (P0) Completion criteria.** As a trainer, I want to define what "complete" means.
- AC1: Options (combinable):
  - all blocks in the rep's path completed
  - final assessment passed
  - verify approved
  - attestation signed (e.g. "I have read and understood the current Prescribing Information")
- AC2: Defaults: Personalised course = path + assessment + verify (if on) + attestation. Linear course = all blocks + knowledge checks ≥ 80% + attestation.

**CC-6 (P0) Preview as rep.** As a trainer, I want to see what reps will experience.
- AC1: Preview mode with simulated screening profiles: *New to therapy area*, *Experienced, new to brand*, *Expert*. Shows each resulting path (modules, minutes, tested-out list).
- AC2: Walk through any block, quiz or scenario exactly as a rep would, on desktop and mobile frames.

**CC-7 (P1) Source library.** As a trainer, I want reusable sources so that I don't upload the PI to every course.
- AC1: Library per organisation with type, product, doc number, version date and which courses use it.
- AC2: Replacing a source (e.g. a new PI version) lists the affected courses and offers "Create new versions".

**CC-8 (P2) Co-authoring.** Multiple trainers on one course, with comments and assignment of sections.

**CC-9 (P1) Course catalogue.** As a trainer, I want a list of all courses with their state.
- AC1: Table: name, product, format, type, current version and state (badge), doc number, expiry, assigned count, certified %, owner, last edited.
- AC2: Filters by state, product, owner; search; "Expiring soon" quick filter.

### E3. Screening, assessment and roleplay setup

**AS-1 (P0) Screening settings.** As a trainer, I want to configure the baseline.
- AC1: Toggle screening on/off (Personalised courses on by default).
- AC2: Quiz: target length (default 12–16 items, ~10 min), **adaptive** (start at medium difficulty; harder after correct, easier after wrong; at least 2 items per competency), drawn from the Screening pool only.
- AC3: Screening call: on/off, scenario choice, max duration (default 5 min).
- AC4: Rep-facing framing text is fixed and friendly: "This isn't a test. It helps us skip what you already know."

**AS-2 (P0) Final assessment and pass criteria.** As a trainer, I want clear pass rules.
- AC1: Quiz: number of items (default 20), drawn randomly per competency from the Assessment pool with coverage of every course competency; question and option order shuffled.
- AC2: Roleplay: on/off, scenario(s), max duration.
- AC3: Pass rule (all must hold):
  - overall ≥ X% (default 80)
  - each **critical competency** ≥ Y% (default 70; the trainer marks which are critical, Label & safety by default)
  - roleplay rubric ≥ Z% (default 75)
  - **no critical compliance violation** in the roleplay (auto-fail)
- AC4: Attempts: max (default 3), cooldown between attempts (default 24 h); after the max, escalate to the manager and trainer.
- AC5: Shows the rep their result immediately with a per-competency breakdown. Answer keys are shown for wrong items only after passing or using the last attempt (to protect the bank).

**AS-3 (P0) Roleplay scenario builder.** As a trainer, I want realistic, approved HCP simulations.
- AC1: Fields:
  - **HCP persona**: name (fictional), specialty, practice setting, patient volume, attitude (e.g. sceptical / busy / loyal to a competitor / curious), knowledge level, communication style
  - **Call context**: first call / follow-up / post-launch; objective
  - **Opening line**
  - **Objection pool**, picked from objections in the sources plus trainer-written ones; the AI raises 1–3 per call
  - **Duration**
- AC2: **Rubric:** weighted criteria tagged to competencies, e.g.
  - opens with a relevant patient type
  - handles the efficacy objection with the approved data
  - delivers fair balance / key safety information
  - asks a closing question

  Each criterion has a description, weight and "what good sounds like" (approved text reference).
- AC3: **Required statements** (e.g. "mentions the boxed warning when discussing X") and **prohibited language** (unapproved indications, superlatives such as "safest", unapproved comparative claims, guarantees). Prohibited items marked *critical* trigger an auto-fail in assessments.
- AC4: **AI HCP behaviour note** (auto-generated, editable, included in the MLR package): what the AI doctor may and may not say; that it stays in persona; that it doesn't provide medical advice; and that it may voice objections or misconceptions only from the objection pool.
- AC5: "Test call": the trainer can call the scenario themselves and see the scorecard.

**AS-4 (P1) Item editor.** Edit, add, retire and re-pool items; difficulty; distractor quality hints from AI; preview.

### E4. MLR approval and versions (manual v1)

**ML-1 (P0) Pre-review checks.** As a trainer, I want to know the course is review-ready before I submit.
- AC1: Checks run on "Ready for review":
  - 🔴 Uncited factual sentences
  - 🔴 Indication not in the product's approved indications
  - 🔴 Missing required safety block (for product courses)
  - 🟠 Superlatives / absolute terms ("best", "safest", "always", "no side effects")
  - 🟠 Comparative claims citing a source not marked as head-to-head data
  - 🟠 Rubric references text that doesn't exist in the blocks
  - 🟢 Item bank coverage (≥ 6 per competency)
  - 🟢 Readability
- AC2: Any red blocks the move; orange needs an "Acknowledge" with an optional note that is included in the package.
- AC3: Each finding links to the exact block or item, with a "Fix with AI" action that proposes a cited rewrite as a diff.

**ML-2 (P0) MLR package export.** As a trainer, I want a review-ready file.
- AC1: PDF (plus a ZIP of the media) containing:
  - **Cover:** course, version ID, date, owner, "For internal training use only – not for distribution to HCPs", audience, objective
  - **Contents**, then all modules and blocks in order with inline citations and a source reference list
  - **Item bank** by pool with answer keys and rationales
  - **Scenarios**, persona descriptions, rubrics, required/prohibited lists and the AI HCP behaviour note
  - **Personalisation statement:** "Learners receive subsets of the approved blocks in this package; no other content is shown"
  - **Change summary** vs the previous version (if any) and acknowledged warnings
- AC2: The version ID is printed in the footer of every page.

**ML-3 (P0) Record review status.** As a trainer, I want Academy to mirror what happens in PromoMats.
- AC1: *Mark as submitted*: submission date (default today), optional PromoMats document ID, optional note.
- AC2: *Changes requested*: paste comments or upload the annotated PDF. Comments become a checklist pinned in the editor; each can be resolved with a link to the change.
- AC3: *Approved*: **document number** (required), approval date, **expiry date** (required), upload the approved PDF (required), and a checkbox "This approval is for version ID {id}".
- AC4: State history with who, when and what, visible on the course.

**ML-4 (P0) Version history.** As a trainer, I want every version kept.
- AC1: Version list: number, state, doc number, approval/expiry dates, published date, certifications issued.
- AC2: Open any old version read-only; compare two versions (block-level diff).
- AC3: "Edit" on an approved course creates **vN+1 Draft**; vN stays live until vN+1 is published.

**ML-5 (P0) Expiry and withdrawal.** As a trainer, I want expired or withdrawn content off reps' screens automatically.
- AC1: Warnings at 30/14/7 days in the action queue (plus email, P2).
- AC2: On expiry: the course disappears from rep paths; reps in progress see "This course is being updated. Your progress is saved." Certified reps keep their certificate, marked "version expired".
- AC3: Withdraw: a reason is required (Label change / Error / Other); optionally start a recertification campaign on a replacement version.

**ML-6 (P2) Veeva Vault PromoMats API.** Create the document in Vault, start the workflow, sync status, doc number, expiry and withdrawal automatically. Replaces ML-3 for connected clients.

### E5. Assignment and campaigns

**AG-1 (P0) Assign a published course.** As a trainer, I want to target the right reps.
- AC1: Audience builder with rules combined by AND/OR: division, region, district/team, therapy area, brand, role, hire date (before/after/within N days), and specific people. Live count: "142 reps match".
- AC2: Type:
  - **Default**: auto-assigned to everyone matching now *and* anyone who matches later (new hires, transfers)
  - **Required**: with a due date (fixed, or N days after assignment for Default)
  - **Recommended**: optional, no due date
- AC3: Options: notify now, include managers as learners, allow managers to see results.
- AC4: Preview of the reps affected, with exclusions (already certified on this version, on leave).

**AG-2 (P0) Campaigns.** As a trainer, I want time-boxed programs for launches and label changes.
- AC1: Campaign types: **Launch readiness** · **Label update recertification** · **New-hire onboarding** · **Annual recertification**.
- AC2: A campaign has a name, purpose, one or more courses (ordered or parallel), an audience, a start date, a due date and escalation rules (remind the rep at −7/−3/−1 days; notify the manager on overdue; notify the trainer at +7 days).
- AC3: Campaign dashboard: readiness % over time vs target, by team, with overdue reps and a "Nudge all overdue" action.
- AC4: **Label update** campaign shortcut from a withdrawn or superseded version: pre-fills the audience (everyone certified on the old version) and the courses (the new version).

**AG-3 (P1) Manager assignment.** As a manager, I want to assign a published course to my team if the trainer allows it.
- AC1: Only courses where the trainer enabled "Managers may assign"; audience limited to the manager's team.

**AG-4 (P1) Due-date management.** Extend the due date for an individual (reason required), pause for leave, bulk extend.

### E6. Rep home and default courses

**RH-1 (P0) Rep home.** As a rep, I want to know exactly what to do next.
- AC1: Mobile-first. **Up next** card (one primary action: "Continue: Module 3 · 6 min left"), then **Due soon**, **My courses** (Required → Default → Recommended), **Practice** entry, and my streak/XP.
- AC2: Each course card shows: progress ring, state (§4.3), due date (red when overdue), estimated minutes left and the version doc number in the details.
- AC3: Default courses assigned by division, therapy area or team appear automatically on first login, with a "Start here" label on the first.

**RH-2 (P0) First-run onboarding.** As a new rep, I want a quick orientation.
- AC1: 3 screens: how Academy works (screening skips what you know) · practice is private · voice consent.
- AC2: Voice consent screen: what's recorded, who can hear it (assessments: you, your manager, the trainer; practice: only you), how long it's kept and that AI analyses it. Agree / Not now (typed fallback until agreed). The text is set by the admin.
- AC3: Mic check with a level meter.

**RH-3 (P0) Learn a block.** As a rep, I want lessons that fit between calls.
- AC1: One block per screen on mobile; swipe or Next; progress in the header; "Save and exit" anywhere.
- AC2: Lessons show citations as small superscripts; tapping one shows the source name and page (no PDF download for reps in v1).
- AC3: Knowledge checks give instant feedback with the rationale; they're ungraded and count toward completion only.
- AC4: Time on block tracked (for records and minutes-saved analytics).

**RH-4 (P0) Linear (default) course.** Completes in order; knowledge-check threshold per CC-5; attestation at the end.

**RH-5 (P0) Attestation.** As a rep, I want to formally confirm I've understood the label.
- AC1: Statement text from the course; the rep types their full name; timestamp stored. Shown as a plain, sober screen (no XP, confetti or badges).

**RH-6 (P0) Certificates.** As a rep, I want proof of my certifications.
- AC1: List of certifications with course, version, doc number, issue date, valid-until and status. Downloadable PDF certificate (P1).

### E7. Screening

**SC-1 (P0) Screening quiz.** As a rep, I want a short baseline so that I can skip what I know.
- AC1: Intro: "~15 min · not graded · helps us build your path."
- AC2: Adaptive per AS-1; one question per screen; no feedback during screening (so it measures, not teaches); can pause and resume.
- AC3: "I don't know" option, scored as wrong without penalising guessing behaviour (reduces noise).

**SC-2 (P0) Screening call ("call one").** As a rep, I want to show how I'd really handle a doctor.
- AC1: The scenario card shows the HCP persona, setting and call objective, plus 30 seconds to prepare.
- AC2: A voice conversation with the AI HCP. Shows a live transcript, timer and End call. The AI raises 1–3 objections from the pool.
- AC3: Typed fallback if the mic is unavailable or consent isn't given (flagged in the record as "typed").
- AC4: The call is scored against the rubric. In screening, results feed competency scores only; there's no auto-fail on compliance, but flagged statements show in the results as "to work on".

**SC-3 (P0) Screening results.** As a rep, I want to see where I stand.
- AC1: Competency map with bands; strongest and weakest areas named in plain language.
- AC2: Path summary: "Your path: 6 of 14 modules · ~42 min (full course 118 min) · Tested out of 8 modules · 2 safety modules required for everyone."
- AC3: CTA "Start my path". Secondary: "See all modules", which shows the full course with tested-out modules marked optional.

**SC-4 (P1) Skip screening.** The rep may choose "Take the full course instead" (logged).

### E8. Personalised path

**PP-1 (P0) Path rules (pick + order only).** As a trainer and compliance owner, I want personalisation that never creates new content.
- AC1: Inputs: competency scores (screening, or the latest assessment for remediation), the block competency tags, Required flags and the trainer's module order and prerequisites.
- AC2: Rules:
  - **Required for everyone** blocks are always included.
  - A competency **Proficient/Expert** (≥ 80) has its personalisable blocks marked *optional – tested out*.
  - A competency **Developing** (50–79) has its core blocks included.
  - A competency **Not yet** (< 50) has core blocks plus reinforcement blocks (flashcards, knowledge checks) included.
  - Order follows the trainer's module order. If the trainer allowed "AI may reorder", modules with the weakest competencies come first, within prerequisites.
- AC3: The path contains **only blocks from the published approved version**. The path record lists block IDs and the version ID.
- AC4: System-written UI text ("You scored 45% on Dosing, so this is included") is allowed. It is interface copy, not product content, and contains no product claims.

**PP-2 (P0) Why this path.** As a rep, I want to understand my path.
- AC1: Each module shows a reason chip: "Gap: Dosing & administration" / "Required for everyone" / "Optional – you tested out".

**PP-3 (P0) Remediation path.** After a failed assessment or Needs coaching, a new path is built from the failed competencies (plus the manager's focus competencies), then the rep retakes.

**PP-4 (P1) Spaced reinforcement.** After certification, 2–3 flashcards or questions per week from the practice pool on the rep's weakest competencies, for 6 weeks. Optional and private.

**PP-5 (P1) Trainer path inspector.** A trainer can open any rep's path: blocks, reasons, time spent and status (not practice).

### E9. Final assessment and verify

**FA-1 (P0) Take the final assessment.** As a rep, I want a clear, fair test.
- AC1: Unlocks when the path is complete. Intro states the item count, roleplay, pass rule, attempts left and that it's recorded.
- AC2: Quiz then roleplay (if on). No feedback until the end.
- AC3: Result screen: Pass/Not yet, overall score, per-competency scores and roleplay scorecard (criteria met/missed with timestamps).
- AC4: Critical compliance violation in the roleplay: fail, with an explanation ("You described use in adolescents; this is not in the approved indication").
- AC5: Not passed: "Your next path: 3 modules · ~18 min", retake available after the cooldown.

**FA-2 (P0) Verify – automatic.** If the course's verify mode is Auto, passing = Certified immediately (certificate, badge, XP).

**FA-3 (P0) Verify – manager sign-off.** As a manager, I want to sign off reps' readiness quickly.
- AC1: On pass, the rep is *Awaiting verify*; the manager gets a queue item (and notification).
- AC2: Review screen: audio player (1×/1.5×/2×), transcript synced to audio, AI scorecard with jump-to-moment links, and quiz score summary.
- AC3: Decisions:
  - **Approve**: certified, with an optional note
  - **Needs coaching**: a note (required) plus focus competencies (required), building a remediation path (PP-3) followed by a roleplay resubmission
- AC4: Pending for more than 5 days: reminders to the manager; the trainer sees it in their action queue and can **verify as delegate** (logged).
- AC5: The trainer configures per course: Auto · Manager sign-off · Manager sign-off for some audiences only (e.g. new hires) (P1).

**FA-4 (P1) Certificate PDF.** Name, course, version, doc number, dates, verifier and "Internal training record".

### E10. Practice (private)

**PR-1 (P0) Practice hub.** As a rep, I want a pressure-free place to practise anything.
- AC1: Tiles: **Prep for a meeting** · **Scenario library** · **Quick quiz** · **Flashcards**. Banner: "Private. Your trainer and manager can't see your sessions."
- AC2: Only content from published approved versions of courses assigned to the rep (scenarios, practice pool, flashcards).

**PR-2 (P0) Prep for a meeting.** As a rep, I want to rehearse a specific upcoming conversation.
- AC1: Choose: product, HCP specialty, persona traits (multi-select: sceptical, time-pressed, loyal to a competitor, cost-focused, data-driven, new to the class), call type, and objections I expect (from approved objection pools; up to 3).
- AC2: The AI HCP is assembled from these settings, within the approved scenario rules (same behaviour note, prohibited list and rubric family).
- AC3: Saved as a "My scenario" for repeat runs. Nothing about a real HCP is entered: no names. A free-text "notes" field is excluded on purpose (it avoids real-HCP PII).

**PR-3 (P0) Practice roleplay and scorecard.** As a rep, I want honest, private feedback.
- AC1: Same call experience as SC-2.
- AC2: Private scorecard: rubric criteria met/missed, top 2 strengths, top 2 things to try, flagged statements (off-label, superlatives, missing safety) as **coaching** (no fail), each with "What the approved material says", which links to the approved block.
- AC3: "Try again" (same scenario) and "Harder" (adds an objection / sharper persona).

**PR-4 (P0) Privacy and sharing.** As a rep, I want control over who sees my practice.
- AC1: No practice data on any trainer or manager screen except anonymous aggregates (TH-7, MG-5).
- AC2: "Share with my manager" on a single session: a confirmation states exactly what is shared (recording, transcript, scorecard). It can be revoked until the manager opens it.
- AC3: Practice recordings auto-delete after the org's retention (default 30 days); the rep sees "Deletes in 12 days" and can delete sooner.

**PR-5 (P1) Quick quiz and flashcards.** 5/10/20 items from the practice pool, filterable by competency; instant feedback with rationale; flashcards with "Knew it / Didn't".

### E11. Gamification

**GM-1 (P0) XP and levels.** As a rep, I want to feel progress.
- AC1: XP for: completing a block (5), finishing a module (20), screening (25), passing an assessment (100, +50 first try), certification (150), a practice session (10, capped at 5 sessions a day), daily streak (5).
- AC2: Levels with names (e.g. Associate → Specialist → Expert → Master) and a progress bar.
- AC3: **No XP** for attestations, safety acknowledgements or anything compliance-related.

**GM-2 (P0) Streaks.** A learning streak counts any day with a completed block, practice session or quiz. One "freeze" per week. Weekends don't break the streak (configurable).

**GM-3 (P0) Badges.** First certification · Launch ready (campaign certified before the due date) · First-try pass · Objection handler (10 practice calls) · 7- and 30-day streaks · Comeback (passed after remediation). Each has art, a description and a date earned.

**GM-4 (P1) Leaderboards (off by default).** The trainer can enable either:
- **Team leaderboard**: districts ranked by % certified and average XP.
- **Opt-in individual**: only reps who opt in, by XP only.

Never by assessment scores, compliance or sales data.

**GM-5 (P1) Celebrations.** Lightweight moments on certification and level-ups. Never on attestation or compliance screens.

### E12. Manager

**MG-1 (P0) Manager home.** As a manager, I want my team's readiness at a glance.
- AC1: Team readiness per required course and campaign (certified / in progress / overdue), the **Verify queue** count, **Overdue reps**, and a team competency heatmap (latest assessment by default).
- AC2: My own learning (if assigned) as a secondary tab.

**MG-2 (P0) Verify queue.** FA-3, sorted by oldest first, with the due date of the related campaign.

**MG-3 (P0) Rep detail.** As a manager, I want to understand one rep.
- AC1: Per course: state, screening vs latest scores by competency (before/after), path progress, attempts, verify history, certifications, coaching notes.
- AC2: No practice information except sessions the rep shared.

**MG-4 (P0) Coaching notes and nudges.** Add a coaching note (visible to the rep and trainer); "Nudge" sends a friendly reminder (rate-limited to one per rep per course per 48 h).

**MG-5 (P1) Team practice pulse.** Aggregate only, team ≥ 5 reps: practice volume trend and the most-missed criteria.

**MG-6 (P2) Field coaching.** Log a ride-along observation against competencies and link it to blocks or scenarios.

### E13. Training records and audit

**TR-1 (P0) Immutable training record.** As a compliance owner, I want proof of who was trained on what.
- AC1: Event log per rep per course version: assigned (by, type, due) · started · screening completed (scores) · path generated (block IDs) · blocks completed (time) · assessment attempts (scores, pass/fail, recording reference) · verify (decision, by, note) · attestation (typed name, timestamp) · certified (dates) · expired/withdrawn/recert events.
- AC2: Records can't be edited or deleted from the UI; corrections are new events with a reason.
- AC3: The record always shows the version ID and doc number.

**TR-2 (P0) Records views and export.** As a trainer, I want audit-ready exports.
- AC1: Views: by rep, by course/version, by campaign, by team.
- AC2: Export CSV and PDF (P1). The PDF carries a cover with filters and the generated-at time.
- AC3: "Who was certified on version X before date Y?" answerable via filters.

**TR-3 (P2) Compliance auditor role.** Read-only access to records and exports across the org.

**TR-4 (P1) Retention settings.** Admin sets retention for assessment recordings (default: keep for the certification's validity + 1 year) and practice recordings (default 30 days).

### E14. Admin and setup

**AD-1 (P0) Organisation setup.** Name, logo, brand colour (for the client's skin of Academy), time zone.

**AD-2 (P0) Org structure and users.** Divisions, regions, districts (teams), territories; users with role(s), manager, division, therapy areas, brands and hire date. Add by invite or CSV import (with validation preview). Deactivate users (keeping their records).

**AD-3 (P0) Products.** Products/brands with indications (short name + exact approved wording), therapy areas and PI source link.

**AD-4 (P0) Competency framework.** Domains and competencies, starting from the default template; edit descriptions; mark default critical competencies. Changing the framework doesn't change existing approved versions.

**AD-5 (P1) Settings.**
- proficiency band thresholds
- practice retention
- assessment recording retention
- voice consent text
- leaderboard policy
- weekend streak rule
- default recert interval
- reminder schedule
- whether managers may assign courses

**AD-6 (P2) SSO (SAML/OIDC), SCIM provisioning, HRIS/CRM territory sync, LMS completion export (xAPI), Veeva Vault API.**

### E15. Notifications

**NT-1 (P0, in-app) / (P2, email & push).**

| Event | Rep | Manager | Trainer |
|---|---|---|---|
| Course assigned | ✅ | — | — |
| Due in 7/3/1 days | ✅ | — | — |
| Overdue | ✅ | ✅ | ✅ (+7 days) |
| Assessment failed, max attempts reached | ✅ | ✅ | ✅ |
| Awaiting verify | — | ✅ | ✅ (after 5 days) |
| Verified / Needs coaching | ✅ | — | — |
| Shared practice session | — | ✅ | — |
| MLR status reminder (in review > 14 days) | — | — | ✅ |
| Approval expiring 30/14/7 | — | — | ✅ |
| Course withdrawn / updated | ✅ (if affected) | ✅ | ✅ |
| Weekly digest | Optional | ✅ | ✅ |

- An in-app notification centre with read/unread; every notification deep-links to the relevant screen.

---

## 7. Metric definitions

All metrics respect the viewer's scope and the scope filter. Practice metrics are aggregate-only, with a minimum group of 5.

| Metric | Definition |
|---|---|
| **Readiness %** | Reps *Certified* on the current version ÷ reps assigned (excluding deactivated/on leave). |
| **Projected readiness** | Current readiness + (certifications per day over the last 14 days × days to the due date), capped at 100%. Labelled "estimate". |
| **Screening → final lift** | Mean final-assessment overall score − mean screening overall score, for reps with both. Also per competency. |
| **% improved** | Reps whose final score > screening score ÷ reps with both. |
| **Time to certified** | Median days from assignment to certified. |
| **Minutes saved** | Σ (full-course estimated minutes − rep's path estimated minutes) over reps who completed a personalised path. |
| **First-try pass rate** | Reps passing on attempt 1 ÷ reps who attempted. |
| **Verify turnaround** | Median hours from *Awaiting verify* to a decision. |
| **Competency proficiency** | Mean latest score per competency (screening or assessment, per toggle), shown as a band. |
| **Item difficulty** | % correct per item over its last 50 attempts (shown once there are ≥ 10 attempts). |
| **Approval-to-practice** | Days from version approved to the first rep start. |
| **Practice volume** | Count of practice sessions and unique practising reps (counts only) per period. |
| **Most-missed criteria** | Rubric criteria with the lowest hit rate across practice sessions in scope (aggregate). |
| **Active learners** | Reps with at least one learning or practice event in the period. |

---

## 8. Success metrics (for pilots)

| Area | Metric | Target |
|---|---|---|
| Trainer speed | Sources → Ready for review | < 1 working day (vs weeks today) |
| Trainer speed | MLR rounds per course | ≤ 2 |
| Rep efficiency | Minutes saved vs full course | ≥ 35% for experienced reps |
| Effectiveness | Screening → final lift | ≥ 20 points average |
| Readiness | Certified by the campaign due date | ≥ 90% |
| Manager | Verify turnaround | < 72 h median |
| Engagement | Weekly active learners (during campaigns) | ≥ 70% |
| Engagement | Reps using practice at least once a month | ≥ 50% |
| Trust | Trainer NPS / "would you build your next course here" | ≥ 8/10 |

---

## 9. Non-functional requirements

### 9.1 Prototype (this phase)
- **Frontend only.** Mock data and simulated AI, with no server. State persists in the browser so a demo survives a refresh, with a "Reset demo" action.
- **View as** switcher for Trainer / Manager / Rep / Admin, to demo every journey in one session.
- **Responsive:** rep screens designed mobile-first (375 px) and tablet; trainer and manager screens designed desktop-first (1280 px+), usable on tablet; manager verify usable on mobile.
- **Accessibility targets:** WCAG 2.1 AA (contrast, keyboard navigation, focus states, captions/transcripts for audio and video, no colour-only status).
- **Performance feel:** AI generation is shown as progressive (streaming text, modules filling in) with realistic but short delays (2–8 s).
- **Polish:** it must look and feel like a shipped product (like SwishX for biz), not a wireframe.

### 9.2 Production (later, for planning only)
- Multi-tenant, with tenant isolation. US data residency. SOC 2 Type II. Encryption in transit and at rest.
- LLM providers with zero data retention and no training on customer data. Model choice per task.
- SSO/SCIM, audit logs, configurable retention, legal hold.
- Uptime 99.9%, voice latency < 800 ms per turn.
- Section 508 / WCAG 2.1 AA conformance report (VPAT).

---

## 10. Compliance and AI guardrails

### 10.1 Content rules
1. **Only approved versions reach reps.** Rep surfaces (lessons, quizzes, scenarios, practice pools, flashcards, reinforcement) read only from *Published* approved versions.
2. **Pick + order only after approval.** Personalisation selects and orders approved blocks; it never generates, paraphrases or summarises product content for reps.
3. **AI writes only while drafting, for the trainer**, from the course's sources, with citations, and all of it goes through MLR.
4. **Safety is never skippable.** Blocks for the boxed warning, contraindications, warnings and precautions, ISI or fair balance are *Required for everyone* and can't be turned off.
5. **Internal-use labelling.** The package and certificates say "For internal training use only".
6. **Version traceability.** Every rep-facing view, record and certificate maps to a version ID and doc number.

### 10.2 Pre-review checks
As in ML-1. The red checks block review; orange need acknowledgement and are printed in the package.

### 10.3 AI HCP roleplay
1. The AI HCP stays in persona; doesn't give medical advice; doesn't state product facts as true beyond the approved material; and raises objections or misconceptions only from the scenario's objection pool or persona traits.
2. **Scoring compares rep statements against** the approved blocks, required statements and prohibited list for that scenario.
3. **In assessments**, a critical prohibited statement (unapproved indication or population, unapproved comparative claim, guarantee of outcome, minimising safety) is an auto-fail with a timestamped explanation.
4. **In practice**, the same detections are shown as coaching only.
5. The AI HCP behaviour note is part of the MLR package, so reviewers approve how the simulation behaves.
6. **Adverse event awareness (P1):** if a rep or the AI HCP mentions a patient side effect in a scenario, the scorecard checks whether the rep followed the approved AE-reporting step, if the course includes one.

### 10.4 Privacy
1. **Practice is private by design:** no individual practice data in any non-rep UI or export; aggregates have a minimum group of 5; sharing is per session and opt-in.
2. **Voice:** consent and notice before the first voice session; no voiceprints or biometric identifiers; retention per TR-4.
3. **Prep-for-a-meeting** takes no HCP names or free-text notes (avoids real-HCP personal data).
4. **Minimal personal data on reps:** name, work email, org fields, learning data.

### 10.5 Records
Immutable, event-based records (TR-1), exportable, with version and doc number on every line.

---

## 11. Release scope

| Capability | Prototype P0 | Prototype P1 | Later (P2) |
|---|---|---|---|
| Trainer home: readiness, lift, action queue, heatmap, practice pulse | ✅ | Content health, approval-to-practice, proof pack | |
| AI course creation: start, outline, generate, cite, chat edits with diffs | ✅ | Source library, item editor | Co-authoring |
| Screening (adaptive quiz + voice call) and path rules | ✅ | Skip screening, path inspector, spaced reinforcement | |
| Final assessment, auto & manager verify, remediation loop | ✅ | Certificate PDF, audience-based verify | |
| Manual MLR states, package export, versions, expiry/withdraw | ✅ | | Veeva Vault API |
| Assignment rules, Default/Required/Recommended, campaigns | ✅ | Manager assignment, due-date tools | |
| Practice: prep for a meeting, library, private scorecard, share | ✅ | Quick quiz, flashcards, team practice pulse | |
| Gamification: XP, levels, streaks, badges | ✅ | Leaderboards, celebrations | |
| Records (log, views) | ✅ | Export PDF, retention settings | Auditor role |
| Admin: org, users (CSV), products, competencies | ✅ | Settings page | SSO/SCIM, HRIS/CRM sync, LMS xAPI |
| Notifications | In-app | | Email, push, digests |
| Medical/MSL content, multi-language, native apps | | | ✅ |

---

## 12. Prototype scope

### 12.1 Demo story
**Corvana Therapeutics** (fictional emerging biotech) is launching **Lumora**, a fictional biologic for moderate-to-severe atopic dermatitis in adults, in 6 weeks. It also has an in-market product, **Cardexa** (fictional, heart failure).
- ~180 users: 2 divisions (Immunology, Cardiometabolic) → 4 regions → 16 districts.
- **Maya Chen** (Trainer / Admin), **David Ortiz** (District Manager, Northeast, 9 reps), **Priya Shah** (Rep, Boston), plus generated reps covering every state in §4.3.

**Seeded content:**
- **Courses:**
  - *Compliance essentials* (Default, Linear, Published)
  - *Atopic dermatitis 101* (Default, Linear, Published)
  - *Lumora launch readiness* (Personalised, Long-form, Published v1, in an active Launch campaign)
  - *Lumora objection handling* (Short, In MLR review)
  - *Cardexa label update 2026* (v2 Draft with Changes requested; v1 Published, expiring in 12 days)
- **Campaign:** "Lumora launch readiness", due in 6 weeks, at 58% certified, trending toward ~88%.
- **History:** 8 weeks of analytics, so trend lines and lift look real.

All brand, drug, company and people names are fictional and marked as such in the prototype footer.

### 12.2 Simulated AI and voice
- **Course generation:** pre-authored Lumora content revealed progressively (outline, then modules streaming in), so it feels generated. Citations point to fictional source documents (Lumora PI, Lumora visual aid, Phase 3 summary).
- **Chat edits:** a set of suggested prompts with authored diffs ("Shorten module 2", "Add 3 harder dosing questions", "Make Dr. Kim more sceptical", "Fix all orange checks"), plus a graceful generic reply for anything else.
- **Voice roleplay:** the browser's speech recognition and speech synthesis where available, driving a scripted HCP dialogue tree (keyword-matched branches per objection), with typed fallback. The scorecard is computed from keyword hits against rubric criteria and the prohibited list, so off-label detection can be shown live (e.g. saying "teenagers" triggers the unapproved-population flag).
- **Screening:** a real adaptive quiz over the seeded item bank; the path is computed with the real PP-1 rules over seeded block tags.

### 12.3 Screen inventory

**Shared:** sign-in (mock) · view-as switcher · notification centre · profile.

**Trainer:**
- T1 Home (analytics)
- T2 Course catalogue
- T3 New course (start)
- T4 Outline review
- T5 Course editor (modules/blocks + chat + citations)
- T6 Item bank
- T7 Scenario builder + test call
- T8 Course settings (completion, screening, assessment, verify)
- T9 Preview as rep
- T10 Pre-review checks
- T11 MLR package preview/export
- T12 Review status & version history (incl. compare)
- T13 Assign (audience builder)
- T14 Campaigns list + campaign dashboard
- T15 Records
- T16 Rep detail

**Manager:**
- M1 Home
- M2 Verify queue + review screen
- M3 Team list
- M4 Rep detail + coaching notes
- M5 My learning

**Rep:**
- R1 First-run onboarding + voice consent + mic check
- R2 Home
- R3 Course overview
- R4 Screening quiz
- R5 Screening call
- R6 Screening results + path
- R7 Block player (lesson, card, video, flashcards, knowledge check)
- R8 Final assessment (quiz + call)
- R9 Result (pass / not yet / remediation)
- R10 Awaiting verify / certified
- R11 Practice hub
- R12 Prep for a meeting
- R13 Practice call + private scorecard
- R14 Achievements (XP, level, streak, badges)
- R15 Certificates
- R16 Attestation

**Admin:**
- A1 Organisation
- A2 People & org structure (CSV import)
- A3 Products & indications
- A4 Competency framework
- A5 Settings

### 12.4 Demo script (the 12-minute walkthrough the prototype must support)
1. **Maya's home:**
   - Lumora launch at 58% → projected 88%
   - lift +27 pts
   - Cardexa approval expiring in 12 days
   - 3 verifications overdue
2. **Maya creates *Lumora objection handling*:** sources → outline → generate → "Make Dr. Kim more sceptical" diff → checks (one orange superlative fixed with AI) → package → mark submitted.
3. **Maya opens *Cardexa label update*:** records MLR approval for v2 → publishes as **Recertify** → a label update campaign is pre-filled → assigned.
4. **View as Priya:**
   - home → *Lumora launch readiness* → screening quiz + call
   - results: 6 of 14 modules, ~42 min
   - one lesson → final assessment
   - in the call she says "great for teenagers" → auto-fail explanation → remediation path → retake → pass → awaiting verify
5. **Priya practises privately:** prep for a meeting with a "sceptical, cost-focused dermatologist" → scorecard → shares one session with David.
6. **View as David:** verify queue → listens at 1.5× → Approve → Priya certified (badge, XP) → team heatmap.
7. **Back to Maya:** readiness ticks up; practice pulse shows "Cost/access objection most missed (aggregate)".

---

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| MLR teams distrust AI-authored content | Slow approvals, lost deals | Citations on every line, pre-review checks, block-level diff between versions, behaviour note for roleplay; position AI as drafting help, with humans approving. |
| AI scoring errors (false off-label flags or misses) | Unfair fails, compliance gaps | Auto-fail only on high-confidence critical matches; manager/trainer can overturn with a logged reason (P1); show the exact transcript moment. |
| Reps fear practice is monitored | Low adoption | Privacy built into the UI copy, no individual practice data anywhere, opt-in sharing, auto-delete. |
| Voice in noisy field settings | Failed sessions | Typed fallback, push-to-talk, short calls. |
| "Yet another platform" for large pharma | Lost enterprise deals | Roadmap SSO/LMS/Veeva; record export now; position as sales-readiness layer, not LMS replacement. |
| ACTO / Quantified feature parity | Weak differentiation | Lead with trainer authoring speed + MLR-locked personalisation + proof of progress. |
| Over-gamification in a regulated setting | Compliance pushback | Sober compliance screens, no XP on attestations, leaderboards off by default. |

---

## 14. Open questions
1. **Program-level screening:** should a campaign with several courses (e.g. disease state + product + access) share one screening instead of one per course? (v1: per course.)
2. Should reps be able to replay their own **screening and assessment recordings**? (Proposed: yes for assessments, after the result.)
3. Should managers see the **screening call** recording, or only scores? (Proposed: scores only; recordings only for verify.)
4. Client **branding**: Academy-branded with the client logo, or fully white-label?
5. **Languages:** is Spanish needed for any US field forces in v1?
6. Who plays the **trainer** at a 50-rep biotech: a dedicated L&D person, sales ops or the brand team? Affects onboarding and templates.
7. Typical **MLR policy for internal training** at target clients: full MLR or a lighter compliance review? (Prototype supports both by labelling only.)
8. Typical **retraining deadline after a label change** (to set campaign defaults).
9. Should the prototype call a **real LLM** for chat edits and roleplay (needs a key in the browser or a thin proxy), or stay fully scripted? (Proposed: scripted for v1 demo reliability.)
