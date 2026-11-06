# SwishX Academy — design guideline

Academy is a standalone product in the SwishX family. It **reuses the SwishX for Business design system unchanged** (tokens, primitives, patterns) and adds a small set of learning patterns. The living reference is the app's `/design-system` page, rendered from the real tokens and components.

## 1. What's shared with SwishX for Business

| Layer | Source | In Academy |
|---|---|---|
| Tokens | `src/app/globals.css` `@theme` block | Same names and colours. The type scale is re-based (see §3). |
| Primitives | `Button`, `IconButton`, `Chip`, `Text`, `Label`, `Surface`, `Field`, `Stack`/`Row`, `Container`, `Modal`, `Panel`, `Portal` | Copied as-is into `src/components/ui/` |
| Patterns | `TabNav`, `Segmented`, `DataTable`, `Toast`, `PageHeading`, `Sheet`, `ActionBar` | Copied as-is into `src/components/patterns/` |
| Principles | SwishX `DESIGN.md` | Apply in full: one screen, one decision; human-readable type; inspectable AI; safe, reversible work |

Change a shared primitive in SwishX first, then copy it across. Academy-only components live in `src/components/patterns/academy.tsx`.

## 2. Look

The picked direction is **A · SwishX Warm, with the energy of direction C on rep screens**:

- **Canvas** is warm off-white (`canvas #fbfaf9`) with white cards (`card`), hairline borders and 24px card radii.
- **Orange** (`brand #fd4816`) is the primary action, and only the primary action. One orange button per screen.
- **Ink** (`ink #0a0d14`) marks focus surfaces:
  - the trainer's proof of progress
  - the rep's hero and mission
  - every call screen
- **Brand-deep** (`#b82f0c`) carries white text where orange can't (contrast). The rep's "Today's mission" uses it.
- **Status colours mean one thing each:**
  - `ok` = certified or correct
  - `warn` = waiting or developing
  - `danger` = overdue, failed or non-compliant

## 3. Type

Figtree throughout. Academy keeps the eleven SwishX token names but re-bases the sizes so the SwishX minimums hold:

| Token | px | Use |
|---|---|---|
| micro | 12 | Tertiary metadata only |
| caption / label | 13 | Supporting text, field labels |
| body | 14 | Dense tables, chips |
| body-lg | 15 | Default reading text, controls |
| subhead | 16 | Rep reading text, quiz answers |
| title | 18 | Card titles |
| display / display-lg | 22 / 26 | Section and screen titles |
| hero / hero-lg | 32 / 40 | Page heroes, big numbers |

Nothing functional goes below 12px.

## 4. Layout by role

| Role | Device | Shell | Opens on |
|---|---|---|---|
| Trainer | Desktop first | Sidebar + content (`DeskShell`) | Analytics: readiness, proof of progress, action queue |
| Manager | Desktop + phone | Same shell | The verify queue and team readiness |
| Admin | Desktop | Same shell | Organisation |
| Rep | Phone first (375–460px) | `RepShell`: top bar + bottom tabs; immersive screens hide both | One mission card |

- **Rep immersive screens** (screening, player, assessment, calls, onboarding) take the whole phone, keep their own exit, and put the primary button at the bottom within thumb reach.
- **Every number on a dashboard** links to the people or items behind it.

## 5. Academy patterns

| Pattern | Use |
|---|---|
| `Card` | Every panel. Tones: card, ink, tint, subtle. |
| `Stat` | A labelled big number with optional unit and sub-line |
| `Meter`, `Ring`, `Sparkline` | Progress, readiness, trends. Always labelled for screen readers. |
| `BandChip`, `bandCellClass` | Proficiency bands: Not yet <50 · Developing 50–79 · Proficient 80–94 · Expert 95+ |
| `VersionChip` | MLR lifecycle: Draft → Ready → In review → Changes → Approved → Published → Expired/Withdrawn/Superseded |
| `ProgressChip` | Rep stage, with an Overdue override |
| `Citation` | Superscript source number with a source + page tooltip |
| `BlockView` | One approved block, identical in the editor, package, player and preview |
| `Scorecard` | Roleplay result in three modes: practice (coaching), assessment (pass/fail), verify (seekable) |
| `CallScreen` | The AI HCP call: prep, live transcript, mic or typed input, demo answer chips |

## 6. Rules

1. **Approved or it doesn't reach a rep.** Rep screens read only from published versions. Every rep-facing record shows the version and document number.
2. **Personalisation picks and orders; it never writes.** Interface copy ("You scored 45 on dosing") is allowed; product text is not.
3. **Safety is never skippable.** Safety modules are "Required for everyone" and the toggle is disabled.
4. **Practice is private.** No per-rep practice data on any trainer or manager screen. Aggregates need 5+ people. Sharing is per session and opt-in.
5. **Sober where it matters.** No XP, confetti or badges on attestation, safety or compliance screens.
6. **AI changes are diffs.** Chat proposes, the trainer accepts or rejects, and nothing changes silently.
7. **One primary action per screen**, visible without scrolling on a 1440×900 desktop or thumb-reachable on a phone.
8. **Accessibility.** WCAG 2.1 AA contrast, real buttons and links, visible focus (`focus-ring`), no colour-only status, reduced-motion respected.
