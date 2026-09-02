# Volt — Product Direction

> The distilled output of product/design planning (Sep 2026). Not a transcript — the decisions,
> best bits, and features that survived. Living doc: update when a decision changes.
> Companion docs: [VOLT_DESIGN_SYSTEM.md](VOLT_DESIGN_SYSTEM.md) (visual spec — pending update to
> the new direction), [backend/ROADMAP.md](backend/ROADMAP.md) (backend phases; superseded in
> sequencing by §7 here), [TEARDOWN.md](TEARDOWN.md) (Hevy × Strava flow-by-flow teardown — the
> steal/beat/never-do lists feeding the feature map).

---

## 1. What Volt is

**The training system for hybrid athletes** — people who lift *and* run (Hyrox, CrossFit-adjacent,
runners who lift, powerlifters in conditioning). One logbook, one training-load picture, eventually
one adaptive plan across both.

**Positioning (revised Sep 2026 after competitive verification):** "One app for both sports" is
no longer unique — HYBRD ships it today, and Strava/Garmin are converging on tracking parity.
Volt's defensible identity is **the competitive layer fused with the tracking**: the hybrid
rating with percentile standards, rival matchmaking, the Vault's cross-modal records, and a
transparent load number — the game nobody has built on top of the data everyone is racing to
collect. Tracking excellence (offline-first, ≤2-tap logging) is the substrate, not the pitch.

**Competitive landscape (Sep 2026, verified):** HYBRD (ex-Whoop team, $14.99/mo, 4.8★) = native
lift log + GPS + unified score, positioned as AI coach — no rating/rivals/medals/gap analytics.
Strava's May-2026 strength log has no progression analytics or load integration *yet* but
explicit intent. Edge (Edge Hybrid LTD, UK, $29.99/mo, 37 US ratings): coach-led hybrid *plan
delivery* (human coaches + AI chat, interference-aware programming) — no confirmed native
set/GPS logging, no load score, no rating/records/social; different quadrant (coaching vs
self-directed tracking+game), but note their channel play: aggressive SEO squatting of
"hybrid training app" searches with self-published comparisons. Garmin researching Acute Strength Load / Strength Balance. Whoop muscular load
went passive. TrainingPeaks/intervals.icu: no credible unified number. ELO mechanics exist only
as gamification shells detached from real tracking (League of Fitness, Gym Rank). **Window on
tracking parity: 12–24 months; the rating/rivalry layer is the durable wedge.** Homework before
v0.9: personally trial HYBRD.

**North-star metric:** weekly active users who logged *both* a strength session and a cardio
session that week. Not downloads, not total workouts.

**Product principles**
1. Logging speed is sacred — every set in ≤2 taps, offline-first, previous session pre-filled.
2. Instrument panel, not social network — dense, dark, data over decoration.
3. Record first, prescribe later — advisory nudges before auto-written plans.
4. The phone is the product — web is marketing + big-screen analytics companion.
5. No stock dashboards — signature charts are custom-drawn; screens ship to mockup quality.
6. One primary focus per screen — at most two supporting modules visible, the rest behind a tap.
   Density is earned by hierarchy, not by cramming.

## 2. Locked decisions

| Decision | Call |
|---|---|
| Existing code | Keep it. Master plan absorbs/supersedes backend-only ROADMAP.md |
| Goal | Real product → public launch |
| Platform | Mobile-first (React Native + Expo). Web = landing + read-only analytics |
| v1 wedge | Strength logging + GPS cardio + analytics-lite + rewards. Social is post-launch |
| Nutrition | Maybe never |
| Monetization | Nothing before retention exists. No billing code in v1. When it comes: IAP via RevenueCat in-app (15% small-business rate) + Stripe on web (keeps the margin); gate only NEW features, never shipped ones (Hevy's habit-first model, not Strava's retro-paywalling); ~1–2 weeks to wire (plan field + webhook + paywall screen) — nothing to pre-build |
| Schema churn | Free until first real users — edit the unmerged Flyway V1 baseline in place, no migration ceremony |
| Design tooling | Code-native (Claude + HTML mockups). No Figma AI / Stitch — the bottleneck is art direction, not tools |

## 3. Design direction — research findings

Problem named honestly: early rounds looked AI-generated (flat cards + sparse accents on
near-true-black = dead zones). Reference bar: Spotify-grade dark cohesion.

**Best bits (from researching Spotify, Linear, Raycast, Vercel, Discord, GitHub, Whoop, Oura,
Apple Fitness, Strava, Nike, Peloton, Robinhood):**

- **Spotify** — base `#121212`-class (never true black), 4-step surface ladder, grayscale chrome,
  color comes from *content* via extracted gradient headers.
- **Linear** — derive all surfaces from one base so nothing drifts out of tune.
- **Raycast** — hierarchy via 3-step text ramp (white/secondary/muted), not size.
- **Vercel** — 1px hairline elevation; mono typeface for all numbers.
- **Discord** — structure by zone darkness (nav darker than content), not borders.
- **GitHub** — intensity heatmap: consistency itself as the graphic (dual-hue lift/run version).
- **Whoop** — one traffic-light vocabulary (readiness), learned once, used everywhere; dedicated
  numeral treatment at huge sizes.
- **Apple Fitness** — true black reserved for the one hero graphic so it reads as an object;
  medallions for streaks.
- **Strava** — the route map is the hero image of every cardio activity.
- **Oura** — charts anchored to personal baseline bands (later).
- **Nike** — giant numerals as layout; prestige tiers.
- **Robinhood** — earned full-screen achievement takeovers (tied to real milestones only).

**Distilled rules:** matte, zero glows · surface ladder + hairlines, no voids · quiet grayscale
chrome, accents rationed and semantic · content supplies the color (muscle hues, route maps,
heatmaps, context-keyed header wash) · one signature graphic: the mirrored strength/cardio load
chart (nobody else has both datasets) · believable data in every mockup — fake-looking numbers
read as AI slop.

**Status:** design is being prepared by Mitvik. Canvas of exploration rounds:
https://claude.ai/code/artifact/4268cde6-3dd1-49bf-9c07-dae52f96e2e6 (round 4 "Matte" rated best
of Claude's; the prepared 5-screen direction uses orange/blue — VOLT_DESIGN_SYSTEM.md still bans
orange and must be updated once the palette is final).

## 4. Feature map — the four loops

### Loop 1 — Log (the daily habit)
- Strength logger: ≤2 taps/set, previous-session prefill, RPE per set, set types, inline rest
  timer with skip, PR detection + reference in header, next-up preview, swipe-to-minimize,
  offline-first. (Backend largely done.)
- **Measurement type is configured per exercise**: `REPS_WEIGHT` (bench) · `DISTANCE` (sled push,
  carries) · `DURATION` (plank) · `REPS_ONLY` (pull-ups). Logger renders inputs from the
  exercise's config; set columns are nullable underneath.
- GPS cardio recording: route, splits, pace; **structured cardio workouts** — intervals with live
  pace targets ("threshold 6×800m · 4s under target"). The cardio twin of routines.
- Routines → start session; ad-hoc log path must always exist (no-plan users).
- From the teardown: **Live Activity / lock-screen logging** (rest countdown + tick sets without
  unlocking); record screen shows map + live stats together; **free Beacon-style live-location
  safety sharing** on cardio; Android background reliability treated as a feature; onboarding
  target: first set logged in ≤90 seconds; privacy-safe defaults + map hide-home + one privacy
  sheet; PR types user-configurable (no junk-PR spam).

### Loop 2 — Understand (the differentiator)
- **Unified load** — one scalar across modalities (7-day acute), with the strength/endurance
  split bar vs the athlete's target (e.g. 58/42 vs 55/45). The normalization formula IS the
  product; if the number feels wrong everything built on it dies.
- **Volt Score (ratings)** — not true ELO (no head-to-head in solo training): standards-based with
  ELO-like dynamics. Strength rating per lift, endurance rating, and the **Hybrid Score**
  combining both — the number nobody else can offer. Per-session deltas ("Bench 642 → 651");
  inactivity decay later (mirrors detraining). Full design: §10.
- **Muscle transparency (Hevy-inspired, plus gaps)** — per-workout muscle chips with set counts
  (derived from the existing exercise→muscle mapping, zero user input); monthly muscle-coverage
  map **including gap callouts** ("hamstrings: 1 session in 4 weeks") — Hevy shows what you did,
  the gap shows what you didn't.
- Balance summary on the dashboard permanently; personal-baseline chart bands later.
- From Reddit mining: the load score must be **transparent and user-correctable** (show the
  formula, allow RPE calibration — opaque wrong numbers killed trust in Whoop's metric); show
  **prospective load** on planned sessions before starting; per-station load attribution for
  Hyrox-style mixed sessions (sprints/carries get zero strength credit in every incumbent).
  Everything is editable after the fact — always. Per-field share controls when posting
  (hide reps/photos/etc.).

### Loop 3 — Progress (retention)
- **The Vault**: kg Clubs per lift (100/120/140/180…), cardio best efforts (sub-22 5K), streak
  Charges, volume weeks — each medal an object; **locked medals show live progress**
  ("120 kg Club — 15 kg to go, ring 88% lit") — the pull-them-back mechanic.
- Rating milestones ("Bench crossed 650"). Auto-generated share cards (dark, mono numbers, route
  or set table as the graphic) — every share is an ad.
- PR moment: earned full-screen takeover. Never for taps, only for real milestones.

### Loop 4 — Connect (post-launch)
- **Rivals — the social centerpiece.** Algorithmic weekly rival "94% similar to you" (ratings
  power fair matching — a 70kg and a 95kg athlete compete on level ground). Category-by-category
  comparison, 7-day load board, Challenge action. Cold-start fallback: your rival is your own
  last week (ghost mode). Solves both the empty-feed and demoralizing-comparison problems.
- **Competition design rules (Reddit-validated, Sep 2026):** always cohort-normalized display
  ("74th percentile among 30–34M at your bodyweight" — never "rank #48,201"); rival scoring
  weights consistency + relative improvement (cheat-resistant, winnable by anyone); the rating
  formula is **published in-app** (Zwift's #1 gripe is opaque points); rolling time-windowed
  boards only, never all-time; every competitive surface is toggleable; aggressive fake-entry
  policing from day one; **gym/crew leagues** (small known-peer groups + consistency crowns —
  Hevy's 58-upvote ask) join Rivals in the v1.1 social scope. Marketing note: never lead with
  "AI-driven."
- Feed: following/nearby, mixed-modality posts with muscle chips + route maps, kudos, comments.
  **Strictly chronological, forever** (Strava's algorithmic-feed revolt is the lesson); one-tap
  kudos; auto-grouped "trained together" sessions; auto-tracked challenges + badge case;
  **consistency crowns** (reward showing up, Local Legends-style — folds into Rivals).
  Monetization guardrails from Strava's scars: only ever paywall new value, never claw back;
  no upsell interstitials; year-in-review stays free (it's acquisition).
- Profile ships in v1 *ready to be public*: workout list with muscle chips, monthly muscle map,
  Vault, ratings.

## 5. Events & goal anchoring

A first-class **Event/Goal** entity: race, date, target split ("Hyrox Frankfurt · 47 days ·
Build 2 · Wk 6 · target 55/45"). The Today screen is a countdown surface — every number gets a
*reason*. Adaptive coaching arrives in two stages: **v1 advisory** ("you're drifting
strength-heavy — consider +14 min Z2") → **v2 auto-write** (the app edits your plan) only once
the load model has earned trust with months of data.

## 6. Mobile IA

Tabs: **Today** (goal-anchored) · **Plan** · **Feed** · **Rivals** · **Profile** (Vault, muscle
map, ratings). Ad-hoc logging reachable from Today without a plan.

## 7. Releases

| Release | Ships | Gate |
|---|---|---|
| v0.9 alpha | Expo app: auth, strength logger, GPS recording, history, Events/Today | You log every workout in Volt for 2–3 weeks and stop missing Hevy/Strava |
| v1.0 launch | + Unified load & balance, Volt Score v1, muscle transparency, Vault, dashboard, landing page, web analytics | App Store |
| v1.1 | Rivals + feed + profiles public, structured cardio, share cards, **first Benchmark Weekend** (one scaled benchmark, Div 3/4, provisional Glicko ratings, title badges) | Enough users for matchmaking + a seeded benchmark field |
| v1.2 | Integrations (Apple Health, GPX/FIT, Strava/Hevy import), challenges | User demand |
| v2 | Adaptive prescription (auto-write), cross-modal load management | Months of dual-modality data |
| v2/v3 | **Voice set logging** — mic/earbud input mid-workout ("hundred kilos, five reps" logs the set; "add thirty seconds" controls the rest timer). Hands-free is the natural end-state of "logging speed is sacred"; on-device speech + a tiny grammar (numbers × units × reps), earbud-first so the phone stays in the pocket. Post-beta: needs the logger stable first, and real-gym noise testing | Beta live + logger habit proven |

## 8. Engineering notes

- Set model: nullable `distance_m` / `duration_sec` on WorkoutSet; measurement config on Exercise.
  Edit the unmerged V1 Flyway baseline in place — no migrations until real users exist.
- HR zones (Z4, bpm) need a source; phone-only v1 degrades gracefully without them.
- Load formula and rating standards need explicit definition docs before implementation.
- Backend phase order (supersedes ROADMAP.md §5 sequencing): merge Phase 3 → mobile-driven
  vertical slices for the v1 wedge → analytics/ratings → social. Backend grows only when a mobile
  screen needs an endpoint.

## 9. Open questions

1. Final palette (prepared orange/blue direction vs round-4 lime/violet) → then update
   VOLT_DESIGN_SYSTEM.md (§tokens, orange ban, fonts).
2. Unified-load formula (strength tonnage × intensity vs cardio TRIMP-style — needs a spike).
3. ~~How to combine lifting and running into one rating~~ → resolved, see §10. Normalization is
   now fully sourced (DOTS/IPF-GL for bodyweight, McCulloch/Foster for age, WMA for running);
   the only remaining open piece is the strength percentile *distribution* table (hand-tune v1,
   recalibrate from Volt's own population later).
4. HR data source for v1 (none / HealthKit / watch later).

## 10. Volt Score — how lifting and running combine

> Implementable algorithm spec (formulas, Glicko-2 parameters, event rules, pseudocode, worked
> examples): [RATINGS.md](RATINGS.md).

The problem: kg and min/km share no unit. The trick: **don't compare units — compare percentiles.**
Each side is scored against a reference population, which puts both on the same 0–1000 scale by
construction; only then are they combined.

**Strength side.**
For each big lift: e1RM (Epley, already computed) → **bodyweight-normalize with the public
DOTS / IPF-GL coefficients** (battle-tested polynomial refinement of allometric `e1RM/BW^(2/3)`
— pure ratio over-rewards light lifters, raw load over-rewards heavy; worked example: 85kg bench
@ 50kg BW → 6.26 allometric points vs 100kg bench @ 100kg BW → 4.64, correctly ranking the
1.7×BW lift higher) → **age via the public McCulloch/Foster coefficients** (a 52-year-old gets
~×1.2 — age never bakes into the strength formula itself) → percentile in a sex/age cohort →
map to 0–1000 (500 = median trained lifter, 750 ≈ top 10%, 900 ≈ top 1%). Every step is a
published formula — feeds the publish-the-formula-in-app rule. Per-lift scores roll up: muscle-group score = best lift in group,
**overall strength score = weighted mean of the top lifts across groups** (so one freak bench
doesn't carry a neglected lower body).

**Endurance side.**
Any timed GPS run → convert to a race-equivalent performance (Riegel exponent / VDOT) → score it
with **WMA age-grading tables** (public, maintained, already sex/age-adjusted — the running
world's standard). Age-grade % maps naturally onto the same 0–1000 scale.

**Hybrid Score = geometric mean: `H = √(S × E)`.**
Chosen deliberately over the alternatives: arithmetic mean rewards specialists (900/100 → 500,
same as 500/500 — wrong for a hybrid app); harmonic mean over-punishes (900/100 → 180);
geometric lands between (900/100 → 300, 500/500 → 500) — imbalance costs you, balance is the
only path to a high number. That IS the hybrid-athlete ethos encoded in arithmetic.

**ELO-like dynamics (what makes it a rating, not a PR museum).**
- The score tracks *current form*: each session's evidence moves it toward the demonstrated level
  with a K-factor, rather than jumping to all-time best.
- **Inactivity decay** per side after a ~14-day grace period (slow drift down, half-life tuned to
  real detraining curves). Stop running and your E — and therefore H — sags. Honest, and it gives
  streaks teeth.
- **Provisional period**: high K for the first ~5 strength sessions / 3 runs, then it stabilizes.
  New users get a usable score fast without it whiplashing forever.
- Session deltas surface in-app ("+31") — the design mockups already show this.

**Anti-gaming.** Endurance ratings only from GPS-recorded or imported (FIT/GPX) activities —
manual entries log fine but don't rate. Strength: implausible jumps (>~15% e1RM in a session)
prompt a confirm and are capped for rating purposes until repeated.

**Uses.** Rivals matchmaking (rating band ± similarity), friend leaderboards (fair across body
weights), tier names (e.g. Contender) and cohort framing ("top 12% of Hyrox men 30–34" — the
mockups have this right: a percentile is more meaningful than a raw number).

**Display note.** Internal scale is 0–1000 per side. The mockups show ~1842-style numbers; if that
scale is kept for display, it must be visually distinct from the load number (load 842 vs rating
1842 rhyme dangerously — different typography/tier-color treatment, always labeled).

**v1 ships**: static scoring + session deltas, hand-tuned strength percentile table (source TBD —
open question), WMA tables for running. Recalibrate percentiles from Volt's own population once
real users accumulate.

### The Benchmark & the ladder (added Sep 2026)

- **The monthly Benchmark**: one standardized ~10–15 min hybrid couplet/triplet (one endurance
  piece + one strength/carry piece, time-or-reps scored), run app-wide on the same weekend each
  month. Deliberately *smaller than Hyrox* — doable in any gym, recoverable in a day, comparable
  because it's short and fixed. It's the retention heartbeat, the community event (Discord/
  benchmark-weekend), and the clean calibration dataset for the load and rating models.
- **Divisions + titles, Codeforces-structured**: divisions are coarse rating-gated brackets you
  *compete in* (with division-scaled benchmark variants — beginners aren't crushed, elites
  aren't bored, one ladder); titles are fine-grained rating bands you *wear* (multiple titles
  coexist in Div 1, exactly like CM→LGM). Promotion/relegation automatic at thresholds.
  The Codeforces/CodeChef mapping is structural inspiration only — Volt's tier *names* are a
  branding decision taken with design (electric register: Spark→Surge→…→Apex, or the athletic
  register the screens already use: Challenger/Contender/Elite), and tier *thresholds* anchor
  to percentile bands of the active rated population (top 1%, next 4%, …) so cutoffs
  self-calibrate as the pool grows — never hardcoded rating numbers picked before data exists.
- **One rating, two evidence streams**: the standards-based score above *seeds and anchors* the
  rating (placement without blind-1500 cold start; ties the ladder to absolute reality), while
  Benchmarks and rival duels are the high-weight **Glicko-2** events that move it. Glicko's
  rating-deviation replaces hand-rolled inactivity decay: missed benchmarks widen confidence
  rather than punitively sagging the number. Don't invent rating math.
- **Trust is the moat — verification scales with stakes**: low divisions = honor system;
  climbing into top divisions/titles = mandatory verification. Cardio rated efforts need
  HR + cadence + pace physiological consistency (sensor fusion beats GPS spoofing; a 70bpm
  "run" is a car). Lifting: benchmarks are *verifiable by construction* (countable reps of
  standardized movements, not claimed 1RMs); continuous-video standard for high-rank attempts.
  Two-tier results (verified/unverified — only verified ranks); Glicko anomaly quarantine for
  implausible jumps. **Beta scope (ponytail): honor system + sanity checks + video above
  Div 3 — nothing more until there's a ladder worth defending.**
- **Beta slice**: one scaled benchmark, Div 3/4 only, provisional ratings, title badge, the
  "you're 1712, Div 2, ↑40 this month" share card. First Benchmark Weekend lands with v1.1
  (Rivals) — it needs a seeded field, even a small one.
