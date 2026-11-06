# SwishX Academy — QA & product review

*2026-11-06 · Prototype as of the Library + product picker build · Reviewed as PM, developer, QA and a pharma client (training lead at a 50–500 rep biotech)*

> **Status (2026-11-06):** sections 1–4 are applied, except S4 and S5, which were left as they are. Section 5 is still open. A role-aware **SwishX AI Agent** panel was added for trainer, manager and rep (`src/features/copilot/`).

## Verdict
The core story works end to end and is strong:

**trainer builds → MLR → assign → rep screens → personalised path → assessment (off-label fails) → manager verifies → proof of progress**

The problem is breadth. Over five rounds we added things a client wouldn't miss, a few settings that do nothing, and demo scaffolding that leaks into the product. A buyer seeing it today would ask "what are all these knobs?" before "how fast can my team build a course?". Cutting about 20% makes the product feel more finished.

---

## 1. Broken: fix before anyone sees it

| # | Where | What's wrong | Fix |
|---|---|---|---|
| B1 | New course wizard | **"Make it measurable" writes the Lumora access objective for any product** (picked Arthelis → objective talks about the Access Hub). | Build the measurable objective from the picked product, indication and competencies. |
| B2 | New course wizard | **Any personalised course gets the Lumora roleplay (Dr. Kim)**, so an Arthelis or Onkavia course's assessment call is a dermatology call about Lumora. | Only attach a scenario when one exists for that product. Otherwise turn the assessment call off and show "Add a roleplay scenario". |
| B3 | Rep → Practice session | **"Try again" doesn't repeat the session; "Harder" always opens Dr. Kim.** Both buttons say something they don't do. | "Try again" replays the same setup. "Harder" adds an objection and a sharper persona to the same setup. |
| B4 | Manager verify (phone) | The **decision panel sits below the full transcript**, so a manager scrolls ~3 screens to approve. The **waveform collapses to nothing** at phone width. | Sticky decision bar on mobile. Fixed-width waveform bars. |
| B5 | Trainer home | **"Reps who improved: 100%"** and the same +27 lift for everyone. Seed data is too perfect; a client will distrust every number on the page. | Add realistic spread: ~85% improved, a few flat or down, varied lift. |
| B6 | Verify queue | **"Passed Oct 6, waiting since Oct 29"**: the seed's pass date and verify-request date disagree. | Request date = pass date. |
| B7 | Course settings | **Prerequisite chips offer Cardexa** (another division) for a Lumora course. | Only offer courses with the same audience, or company-wide ones. |
| B8 | Rep → Quick quiz | "Another 5" reloads the whole page. | Re-draw questions in place. |
| B9 | Content health | Video drop-off sits under "last 50 attempts", which is a question metric. | Separate labels per row ("last 50 viewers" for video). |

## 2. Prototype scaffolding leaking into the product

| # | What a client sees | Fix |
|---|---|---|
| L1 | **"DEMO · TAP TO ANSWER WITHOUT A MIC"** plus **"Off-label answer (try it)"** chips on every call. Fine for us in a pitch, harmful in a client pilot. | Put them behind one *Presenter mode* switch in the avatar menu, off by default. |
| L2 | "In a live rollout you'd retake after 24 hours; **the demo** lets you retake straight away." | Enforce the cooldown; Presenter mode skips it. |
| L3 | **Internal PRD references in the UI:** "(PRD §10.1)", "(PRD ML-6)", "(PRD AS-2)". | Remove. Keep the explanation, drop the reference. |
| L4 | "…exploring **in this demo session**" on the Library stat. | Real count wording, or remove the sub-line. |
| L5 | **Design system** in the trainer's main navigation. | Move to the avatar menu under Presenter tools. |
| L6 | **Two "Maya" entries** in View as (Trainer and Admin). | See C1: Admin folds into the trainer's Settings. |

## 3. Cut: doesn't earn its place for a 50–500 rep client

| # | Feature | Why it goes |
|---|---|---|
| C1 | **Admin as a separate role and app** | At our target client, the training lead *is* the admin. A separate persona with its own nav doubles the surface for four pages. Fold Organisation, People, Products and Competencies into a **Settings** section of the trainer app, shown to anyone with the admin role. |
| C2 | **Settings that do nothing:** leaderboard policy (there's no leaderboard), brand colour (applied nowhere), "weekends break the streak" (not used), proficiency bands (the code ignores them), default recertification (not used), "managers may assign" (feature not built, on the org *and* every course) | Fake settings are worse than missing ones: a client toggles one and nothing changes. Keep only practice retention, recording retention and consent text, which are real compliance levers. |
| C3 | **Competency editing in Admin** | Edits don't flow anywhere (stored, never read). Competencies matter, but editing them is a services setup task in v1. Make the page read-only: "Set up with your SwishX team". |
| C4 | **Manager "My learning" via the rep app** (sessionStorage switch so David can enter the rep app as himself) | Fragile and confusing: the chrome then says "Rep". Show manager courses as a simple list in the manager app with a "Continue on your phone" note. Remove the rep-app impersonation. |
| C5 | **"Let AI reorder the path"** | Nobody asked for it, and order is a trainer decision MLR cares about. Default off, so remove the toggle. |
| C6 | **Rep home "My courses" list and Badges row** | The rep home now stacks 8 sections; My learning and Me already have both. The home should be: mission · due soon · practice · quick watch · library entry. |
| C7 | **"Recently used" products in the picker** | Seeded and fake ("Psorivex" was never used). Remove until real history exists. |
| C8 | **Unused ported code:** `Sheet`, `ActionBar`, `Container`, `Stack`/`Row`, `scopeSummary` | Dead code. Delete; it can be re-ported when needed. |

## 4. Simplify: keep, but lighter

| # | Area | Change |
|---|---|---|
| S1 | **Course Settings: 25+ controls on one page** | A training lead wants defaults that are right. Show 6 decisions:<br>- screening on/off<br>- verify (auto or manager)<br>- pass mark<br>- attempts<br>- recert period<br>- Library visibility and prerequisites<br><br>Everything else goes under "Advanced". |
| S2 | **Course workspace has 7 tabs** (Content, Questions, Roleplay, Settings, Preview, Review & versions, Assign) | Merge Questions + Roleplay into **Assessment**. Assign stays as a header button only. That leaves 5 tabs. |
| S3 | **The chat panel shows on locked, published courses** with nothing to do | Hide it on locked versions. Show "Edit as v2" in its place. |
| S4 | **Trainer home: 6 cards** | Keep all six (they're the pitch), but make Practice pulse and Content health collapsible, so the first screen is readiness + proof + action queue. |
| S5 | **Rep course page:** status card + up next + explore list + path + tested-out + screening link + notes | Order by stage and hide what doesn't apply (no Explore list once certified, which is already true; also hide it once for-credit learning starts). |

## 5. Gaps a client will ask about in the first demo

1. **"Can I edit the roleplay doctor?"** The Roleplay tab is read-only. The PRD has a scenario builder. Minimum: edit persona traits, objections and rubric weights.
2. **"Where's my LMS / SSO?"** Answer exists (roadmap), but there's no visible "Integrations" status beyond a static card. Fine for now; have a one-liner ready.
3. **"Show me one rep's whole history."** Rep detail covers one course at a time. A cross-course timeline would answer audit questions faster.
4. **"Can managers assign?"** We imply yes in settings (C2) but it isn't built. Either build a minimal version or stop implying it.
5. **"How do I get my content in?"** Upload in the wizard is cosmetic: a file becomes a fake "Visual aid" source. For a pilot, uploads should at least keep the file name, type and page count chosen by the trainer.

## 6. What's working well (don't touch)
- **MLR lifecycle:** checks → package → submitted → approved with doc number and expiry → publish with Recertify → campaign. This is the differentiator and it's tight.
- **Off-label auto-fail** in the assessment call, with the exact quote and a link to the approved material.
- **Personalisation** that only picks and orders approved blocks, with visible reasons ("Gap: dosing 45", "Required for everyone").
- **Practice privacy:** aggregates only, opt-in share, auto-delete.
- **Library + foundations-first**, with explore credit carrying over.
- **The product picker** (variants → indications → therapy area, approved wording).

---

## Proposed cleanup, in order
1. **Fix B1–B9** (about half a day).
2. **Remove the demo leaks:** a Presenter mode switch (L1, L2, L5), the PRD references and demo wording (L3, L4).
3. **Cut C1–C8:** Admin folds into trainer Settings, fake settings and AI reorder go, the rep home gets slimmer, dead code is deleted.
4. **Simplify S1–S3:** a basic/advanced split for settings, an Assessment tab, no chat on locked versions.
5. **Re-run the full click-through and a production build.**

Gaps in §5 are product decisions for later and aren't part of this cleanup.
