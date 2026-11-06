# SwishX Academy — prototype

An AI training academy for pharma field teams. This is a **frontend-only prototype**: there is no backend. Mock data lives in the browser (localStorage), and the AI is simulated. All companies, products, people and numbers are fictional.

## Run it

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Open http://localhost:3100. It opens on the trainer home (Maya). Switch to Manager or Rep from the avatar menu (top right). Its **Presenter tools** hold:
- **Presenter mode**: tap-to-answer chips on calls, and no retake cooldown. Turn it on before a demo; it's off by default.
- **Design system**
- **Reset demo data**

Organisation, people, products, competencies and privacy settings are under **Settings** in the trainer sidebar. The old `/admin` links redirect there.

**SwishX AI Agent** opens from the right in every role: the header button or ⌘J on desktop, the round button on the phone.
- Trainer: an action queue, nudges, skill gaps and expiries, and course readiness for MLR. While editing a course, it's the editing chat.
- Manager: who needs you, call summaries before you verify, 1:1 prep, and team versus region.
- Rep: the next step, plain-language module summaries from approved content, objection prep, and off-label guardrails. It's off during screening and assessments.

## The 12-minute demo (PRD §12.4)

1. **Maya, Trainer.** The home screen shows Lumora launch readiness, screening → final lift, the action queue and the competency gaps.
2. **Create course.** Ask the SwishX AI Agent to "Build a course for Arthelis" (or use Create course). Goal → sources → competencies → AI outline → generate. In the editor, the agent becomes the editing chat: ask it to "Fix all citation and wording issues" and accept the diff. Then Review & versions → checks → generate MLR package → mark submitted → record approval → publish.
3. **Cardexa label update.** v2 is back from MLR with comments. Fix them in the editor chat, resolve the comments, then resubmit → approve → publish as **Recertify** → create the recertification campaign.
4. **Priya, Rep (phone).**
   - Onboarding and voice consent. Her first mission is a foundation course (Atopic dermatitis 101): Lumora screening is locked until it's done.
   - Library tab: playlists, short videos, readings, graphics. Explore Lumora modules without starting for credit; what she opens is ticked off later.
   - Finish AD 101 to unlock screening.
   - Screening: adaptive quiz, then a call with Dr. Ruiz. Use your mic, type, or (in Presenter mode) tap the suggested answers.
   - Path: 6 of 14 modules, then the final assessment.
   - In the call, tap **Off-label answer (try it)** (Presenter mode) to see the automatic fail and the retake path, then retake and pass. Outside Presenter mode the retake waits for the cooldown.
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
| `src/features/{trainer,rep,manager,admin}/` | Screens by role (`admin/` renders the trainer's Settings) |
| `src/features/copilot/` | The right-hand copilot: panel, and one brain per role (`brains.ts`) |
| `src/components/ui`, `src/components/patterns` | Ported SwishX for Business components and Academy patterns |
