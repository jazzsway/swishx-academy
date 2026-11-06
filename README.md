# SwishX Academy — prototype

An AI training academy for pharma field teams. This is a **frontend-only prototype**: there is no backend. Mock data lives in the browser (localStorage), and the AI is simulated. All companies, products, people and numbers are fictional.

## Run it

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Open http://localhost:3100 and pick a role. Switch roles any time from the avatar menu (top right), which also has **Reset demo data**.

## The 12-minute demo (PRD §12.4)

1. **Maya, Trainer.** The home screen shows Lumora launch readiness, screening → final lift, the action queue and the competency gaps.
2. **Create course.** Goal → sources → competencies → AI outline → generate. In the editor, ask the chat to "Fix all citation and wording issues" and accept the diff. Then Review & versions → checks → generate MLR package → mark submitted → record approval → publish.
3. **Cardexa label update.** v2 is back from MLR with comments. Fix them in the editor chat, resolve the comments, then resubmit → approve → publish as **Recertify** → create the recertification campaign.
4. **Priya, Rep (phone).**
   - Onboarding and voice consent.
   - Screening: adaptive quiz, then a call with Dr. Ruiz. Use your mic, or tap the demo answers.
   - Path: 6 of 14 modules, then the final assessment.
   - In the call, tap **Off-label answer (try it)** to see the automatic fail and the retake path, then retake and pass.
   - Sign the attestation.
5. **Priya, Practice.** Prep for a meeting → private scorecard → share it with David.
6. **David, Manager.** Verify queue → play the recording, seek through the transcript → Approve. Priya is certified.

Voice uses the browser's speech recognition and speech synthesis (Chrome, Edge or Safari). Without them, or without consent, calls are typed.

## Where things are

| Path | What |
|---|---|
| `docs/01-research-brief.md` | Market and compliance research |
| `docs/02-prd.md` | Product requirements (stories, lifecycles, guardrails) |
| `docs/DESIGN.md` | Design guideline; the `/design-system` page is the living reference |
| `src/data/` | Fictional content: org, Lumora course, question bank, roleplay scenarios, seed generator |
| `src/store/` | Zustand store (all actions) and selectors (analytics, XP, badges) |
| `src/lib/learning.ts` | Path rules (pick + order only), scoring |
| `src/features/roleplay/` | AI HCP engine, voice hook, call screen, scorecard |
| `src/features/{trainer,rep,manager,admin}/` | Screens by role |
| `src/components/ui`, `src/components/patterns` | Ported SwishX for Business components and Academy patterns |
