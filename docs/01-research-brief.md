# SwishX Academy — Research Brief

*2026-11-06 · Input to the PRD · Most market sources are vendor content; vendor claims are marked as such.*

## 1. Summary

1. **The market is crowded on AI roleplay, thin on trainer authoring.** A dozen vendors sell "practice with an AI doctor". Few make the trainer's job easier: going from approved source material to a structured course, assessments and personalised paths, with MLR built in. That's our wedge.
2. **ACTO is the closest direct competitor.** It's a life-sciences-only "field excellence" platform: training, test-out journeys, certification, AI roleplay and coaching, with a Veeva Gold partnership and PromoMats integration. Quantified and SmartWinnr lead on pharma AI roleplay plus certification.
3. **Compliance is the buying criterion, not a feature.** Buyers ask whether the platform:
   - scores only against MLR-cleared content
   - flags off-label language
   - produces audit-ready records
   - how fast approved content reaches reps

   Our "pick + order approved blocks only" rule fits this directly.
4. **Proving impact is the trainer's biggest unsolved pain.** Most teams measure reaction and quiz scores, not behaviour or business change. "Proof of progress" on the trainer home screen is the right instinct.
5. **Test-out / personalised paths are proven in pharma** (ACTO Journeys; Kaléo's baseline quiz → pathway → same endpoint). Our screening → personalised modules loop matches how good programs already work. AI makes it cheap to run per rep.

## 2. Competitive landscape

| Vendor | What it is | Pharma depth | Relevance to us |
|---|---|---|---|
| **ACTO** | Life-sciences "Intelligent Field Excellence": training, Journeys (test-out), certification (3 methods), AI roleplay (TalkTRx, CxZone), coaching, insights | Life sciences only; Veeva Gold partner; claims 21 CFR Part 11 + SOC 2 Type II | **Closest direct competitor.** Benchmark for feature parity. |
| **Quantified** | AI roleplay + compliance scoring + certification for regulated sales | Strong pharma story (vendor-cited: Sanofi, Bayer, Novartis) | Sets buyer expectations on compliance scoring and manager workflow. |
| **SmartWinnr** | Quizzes, gamification, AI roleplay, certification, field coaching | Pharma-focused; generic CRM/LMS integrations | Closest on gamification + quizzes; weak on integrations per reviews. |
| **Mindtickle** | General revenue enablement; strong course builder, adaptive spaced reinforcement | ~11% of G2 reviewers are pharma | Enterprise incumbent large pharma may already own. |
| **Allego / Showpad Coach** | General enablement; Showpad has merged with Bigtincan | Generic | Incumbents; roadmap uncertainty at Showpad. |
| **Hyperbound, Skillet, Wayground, Pitcher, Deepful** | Newer AI roleplay entrants targeting pharma (Skillet out of stealth Jun 2026) | Roleplay-led | Shows roleplay alone is commoditising. |
| **Veeva AI Agents** (Dec 2025) | Pre-call, Voice, content-review agents inside Vault CRM / PromoMats | Native to the stack | No training product found, but Veeva owns the rep's workflow. Integrate, don't compete. |

**White space for Academy:**
- trainer-first AI course authoring from approved sources
- an MLR-locked block model that makes per-rep personalisation compliant by design
- a trainer home built around proof of progress

Roleplay is table stakes, so we need it, but it isn't the differentiator.

## 3. What buyers evaluate (Quantified buyer framework; vendor source)

- **Compliance architecture:** ingests approved content, flags off-label or prohibited language and missing required statements (safety info), and keeps reviewable session records.
- **Realism:** configurable, specialty-specific HCP personas, and scenarios that match real call length.
- **Manager workflow:** coaching priorities "in minutes, not hours"; a per-rep strengths/gaps view; trainer-set pass thresholds; failed reps routed to remediation.
- **IT defensibility:** SOC 2 Type II, no training on customer data, US hosting, SSO/LMS/CRM. Deferred for us, but have an answer ready.
- **Speed:** "How long from final approval to a rep practising on it?" They flag pilots that take a quarter to stand up as a red flag.

## 4. Compliance and regulatory findings

**MLR for training content.** We found no FDA rule that explicitly requires MLR on internal-only training. Common practice is to route rep training through MLR or compliance sign-off anyway, labelled "for internal training only". OPDP treats rep presentations as promotional, and anything a rep learns, they repeat to HCPs.
→ **Design for MLR on everything rep-facing, including assessment questions and answer keys.** Let each client's policy decide how strict to be.

**PromoMats lifecycle.**
- Approved documents carry a document number, an approval date and an expiration date.
- They can be expired or withdrawn, and auto-withdrawn when a product registration is withdrawn.
- Veeva auto-withdraws expired content from CRM distribution.

→ Academy needs the same lifecycle on its side even in the manual v1: a doc number per course version, an expiry date with warnings, a "withdrawn" state that pulls content from reps, and no edits to an approved version (an edit creates a new draft).

**Training records (Corporate Integrity Agreements).** Sample CIAs require:
- job-specific training for new staff within a set window (e.g. ≥3 hours within 45 days)
- annual refreshers (e.g. ≥4 hours a year)
- retained records proving it happened, with certifications

→ An immutable record per rep of course **version**, dates, scores, time spent and attestation. Exportable.

**AI roleplay scoring.** The vendor pattern: score every session against an MLR-cleared library, with required statements, balanced evidence (fair balance) and disallowed phrasing in the rubric. Off-label language is an automatic fail on assessments. No independent accuracy data exists.
→ Rubrics are part of the approved package. In practice mode, flags are coaching only.

**Gamification.** Guidance across sources:
- gamify only behaviours compliance would sign off on
- never let a leaderboard replace certification records
- don't make compliance training playful
- reward learning behaviours, not revenue

→ Points and badges for learning and practice. Leaderboards opt-in or team-level. Compliance and attestation steps stay sober.

**Voice recordings.**
- An AI roleplay has no outside party, so the issue is employee notice: tell reps that AI analyses their recording, how it is stored, and for how long.
- Avoid voiceprints (Illinois BIPA risk).
- Use a defined retention schedule, not "keep forever".

→ A consent and notice screen before the first voice session, short retention for practice, and policy-driven retention for assessments.

**Label changes.** FDA safety-label changes run on tight timelines (30-day discussion plus a 15-day order). We found no published standard for field retraining deadlines; it's set by internal SOPs.
→ A "label update" campaign type: the affected courses go back to draft, then all affected reps must re-certify by a date. Verify typical deadlines with a design partner.

## 5. Learning design findings

- **Onboarding pattern:** home study → in-person class → field. Often a ~90-day ramp ending in sign-off on product knowledge and detailing. Home study alone doesn't build expertise: the most frequent, difficult and important topics should repeat across study, live training and reinforcement.
- **Competency pillars** (a common framing): compliance knowledge · product/clinical fluency · HCP conversation execution · access/formulary objection handling. **Tiered certification:** foundational → advanced → therapy area.
- **Test-out:** a baseline quiz maps reps to pathways; competent reps fast-track; everyone ends at the same endpoint (Kaléo, ACTO Journeys). This validates our screening → personalised modules loop.
- **Reinforcement:** adaptive spaced repetition (Mindtickle) and micro-reviews before calls. Evidence is vendor-only, but the pattern is standard.
- **Peer learning:** trainers want reps to learn from each other's best moments, not just trainer-built scenarios.
- **Measurement:** LTEN 2024–25 lists proving impact as the persistent challenge. Reaction and quiz scores dominate; behaviour and business impact are rarely measured.
- **AI authoring speed:** Novartis and Moderna (LTEN 2025, vendor recap) cite course creation cut from 6+ weeks to hours.

## 6. Implications for the PRD

**Confirmed by research:** pick + order personalisation · screening = quiz + voice call · verify = system + optional manager · aggregate-only practice visibility · manual MLR first.

**Add to scope:**
1. **Competency taxonomy** per client, with every block and question tagged. It's the engine behind screening, personalisation and analytics.
2. **Approved-version lifecycle:**
   - states: Draft → In review (manual) → Approved (doc no., dates) → Published → Expiring → Expired/Withdrawn
   - edits after approval create a new draft
   - expired or withdrawn content leaves reps' paths, with a notice
3. **MLR review package export** covering lessons, assessment items, answer keys and roleplay rubrics.
4. **Training record** per rep per course version: an immutable log, read-and-understood attestation, and export.
5. **Label-update / recertification campaign** with a deadline, tracking and escalation to managers.
6. **Practice "prep for a meeting" mode:** the rep picks the HCP type, specialty and objection they expect, and practises privately.
7. **Proof-of-progress metrics:**
   - readiness % by team/brand
   - screening → final lift
   - time to certified
   - time from approval to rep practice
   - weakest competencies
   - item analysis (questions everyone misses)
8. **Voice consent/notice screen** and retention settings.

**Explicitly later:** SSO/SCIM, LMS sync (xAPI), Veeva Vault API, CRM-linked business impact, offline mobile.

## 7. Still to validate (design partner / counsel)

- Each client's MLR policy for internal training: full MLR, or a lighter "compliance sign-off"?
- Typical field retraining deadline after a label change.
- Whether assessment recordings must be retained (and how long) when they are part of a certification record.
- Who in a biotech plays "trainer": a dedicated L&D person, the brand team, or the sales ops lead?

## Sources

- Quantified — [Buyer's framework](https://quantified.ai/post/ai-sales-coaching-platforms-for-pharmaceutical-sales-a-buyers-framework-for-compliance-realism-and-manager-workflow) · [State of AI sales training in pharma](https://www.quantified.ai/state-of-ai-sales-training-in-pharma) · [Compliance readiness](https://www.quantified.ai/use-cases/compliance-readiness) · [LTEN 2025 takeaways](https://www.quantified.ai/post/4-things-we-learned-about-pharma-training-at-lten-2025)
- ACTO — [Platform](https://acto.com/acto-intelligent-field-excellence-platform/) · [Journeys](https://acto.com/platform/journeys-capability/) · [Veeva partner](https://acto.com/partners/veeva/) · [TalkTRx launch](https://prnewswire.com:443/news-releases/acto-launches-talktrx-to-improve-pharma-field-rep-conversations-with-hcps-302136308.html) · [Veeva Gold status](https://www.pharmavoice.com/press-release/20260902-acto-achieves-veeva-gold-product-partner-status-following-a-nearly-decade-1/)
- SmartWinnr — [Pharma](https://smartwinnr.com/industry-pharma) · [Sales certification](https://smartwinnr.com/use-case/sales-certification) · [AI roleplay for pharma](https://smartwinnr.com/blog/ai-role-play-pharma-sales-training)
- Others — [Hyperbound pharma](https://www.hyperbound.ai/uses/pharmaceutical-companies) · [Wayground](https://wayground.com/forbusiness/solutions/pharmaceutical-sales-training) · [Pitcher](https://pitcher.com/entering-a-new-era-of-pharma-rep-coaching-with-ai-roleplay/) · [Skillet](https://newsroom.xpr.media/?p=162419) · [G2 Mindtickle vs Showpad Coach](https://g2.com/compare/mindtickle-vs-showpad-coach) · [Showpad vs Mindtickle 2026](https://pipeline.zoominfo.com/sales/showpad-vs-mindtickle)
- Veeva — [How to expire a document](https://support.veeva.com/hc/en-us/articles/360057451933-How-to-Expire-a-Document-in-PromoMats-and-Veeva-Medical) · [Auto-expire (withdrawn registrations)](https://commercial.veevavault.help/en/gr/823625) · [PromoMats product brief](https://www.veeva.com/resources/vault-promomats-product-brief/) · [Veeva AI Agents](https://www.marketscreener.com/news/veeva-systems-announces-the-availability-of-veeva-ai-agents-for-vault-crm-and-promomats-ce7d51dedd80f52c)
- Compliance — [vablet: MLR-ready content](https://www.vablet.com/pharma-compliance-content-management/) · [DIA: promotional review](https://globalforum.diaglobal.org/issue/april-2021/time-to-review-your-promotional-review/) · [HealthStream: CIA training](https://www.healthstream.com/resources/meeting-the-training-requirements-of-corporate-integrity-agreements) · [OIG pharma compliance roundtable](https://OIG.hhs.gov/compliance/compliance-guidance/docs/Pharmaceutical-Compliance-Roundtable.pdf) · [Lachman: safety labeling changes](https://www.lachmanconsultants.com/2025/09/revised-draft-guidance-on-safety-labeling-changes-implementation-of-section-505o4-of-the-fdc-act/)
- Gamification — [Hoopla: pharma without compliance headaches](https://hoopla.net/pharma-sales-rep-engagement-gamifying-territory-performance-without-compliance-headaches/) · [Valuebound best practices](https://www.valuebound.com/resources/blog/gamification-pharma-sales-training-best-practices)
- Learning design — [L-TEN: home study limits](https://legacy.l-ten.org/?p=5014) · [L-TEN Kaléo case](https://read.nxtbook.com/lten/focus/january_2025/cover_story_kaleo_achieving_field_rep_confidence_and_competence.html) · [Allego certification blueprint](https://www.allego.com/blog/blueprint-for-pharmaceutical-sales-certification/) · [Rework onboarding](https://resources.rework.com/libraries/pharmaceutical-growth/rep-onboarding-training-coaching) · [Mindtickle spaced reinforcement](https://www.mindtickle.com/news/adaptive-spaced-reinforcements-knowledge-retention/) · [LTEN 2024 trends](https://www.l-ten.org/common/Uploaded files/Focus/LTEN-2024-HotTopics-Trends.pdf) · [PharmaGenesis LTEN recap](https://www.pharmagenesis.com/news-and-events/revolutionizing-pharma-training) · [Arist: Novartis & Moderna](https://arist.com/blog/the-future-of-life-science-training-with-novartis-moderna)
- Recording/privacy — [Reed Smith: AI recording](https://www.reedsmith.com/our-insights/blogs/employment-law-watch/102ls2n/the-legality-of-ai-powered-recording-and-transcription/) · [Mondaq: AI transcription risks](https://www.mondaq.com/unitedstates/privacy-protection/1780762/ai-transcription-tools-under-scrutiny-navigating-privacy-risks-and-practical-mitigation-strategies)
