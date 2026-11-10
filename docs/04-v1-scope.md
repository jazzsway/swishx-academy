# v1 scope: what's hidden

v1 is two roles, **trainer** and **rep**. Anything outside that is hidden, not deleted: the code stays in place, commented out or switched off, and every spot is tagged `v1-hidden`.

```bash
grep -rn "v1-hidden" src next.config.ts
```

Hidden pages redirect (see `next.config.ts`), so old links land somewhere sensible. To bring a page back, delete its redirect line, then uncomment its nav item and the links tagged `v1-hidden`.

## Trainer

| Hidden | Where it went |
|---|---|
| Campaigns (list, new, detail) | Home's rollouts are the required courses and their due dates. Recertifying after a label update puts people back on their list, due in 14 days. |
| Library page, New playlist, Publish a reading | Its numbers (most opened, searches with no answer) are on **Analytics** |
| Verify queue (verifying on a manager's behalf) | Not needed: passing the assessment certifies |
| Settings › Privacy & consent | Defaults apply |

New: **Analytics** (`/trainer/analytics`) brings every number together: proof of progress with the export, skill gaps by region, course completion, Signals, practice patterns and content gaps. Home keeps what needs action.

## Course creation

- **Wizard:** 4 steps instead of 5 (Goal → Sources → Outline → Generate). Competencies are suggested chips at the top of Outline.
  - **"How do reps go through it"** is hidden. Every new course is personalised.
  - **"Who is it written for"** is hidden. Every course is written for field reps.
- **Course settings:** hidden here:
  - "Who certifies" (always automatic)
  - Library visibility
  - "Reps can explore before starting"
  - Roleplay pass score and cooldown (the defaults apply)
- **Assign:** the campaign picker and the Managers role chip are hidden. Assignments go to reps only.

## Manager

The whole persona is hidden: it's gone from View as, and `/manager/*` redirects to the trainer home.

Manager sign-off is off, so `verify` is `"auto"` on every course. In the demo data, reps who were waiting for sign-off, or who were sent back for coaching, are certified.

## Rep

| Hidden | Notes |
|---|---|
| Library tab, quick-watch rail, explore before starting | My learning lists assigned and opted-in courses |
| Quick quiz, Flashcards | Practice is the AI-doctor call and Prep for a meeting |
| Share a practice session with my manager | Practice stays fully private |
| Badges on Me | Level, streak and certificates stay |
