# Hevy × Strava — Flow Teardown

> Deep dive into every major flow of both apps (researched Sep 2026, sources in the research
> notes): what each does, what's loved, what's hated, and the verdict for Volt.
> Companion to [PRODUCT.md](PRODUCT.md) — §3 of this doc is the actionable output.

## 1. Hevy — flow catalog

| Flow | What works | What doesn't | Verdict for Volt |
|---|---|---|---|
| Onboarding | First set loggable in ~90s, no upfront paywall | "Aha" comes late; web/mobile misaligned | **Steal + improve**: 3-question goal step seeds a starter routine |
| Routine builder + folders | Clean builder, shareable folders | Free cap 4 routines; no periodization — static lists | **Steal + improve**: add optional week-to-week progression rules |
| Exercise library/detail | 1,000+ exercises; detail page = instructions + muscle diagram + personal history/charts/records tabs | Custom-exercise cap; assumes gym vocabulary | **Steal as-is** — the detail-page tab pattern especially |
| Live logging | Prefill from last session + tick = ~15s/set; set types, RPE, supersets w/ smart scrolling, plate calc, notes | **No offline logging** (needs internet); UI can feel busy | **Steal as-is, ship offline-first** — that's the wedge |
| Rest timer | Auto-start on set-tick, per-exercise durations, ±15s, Live Activity | — | **Steal as-is** |
| PR detection | Aggressive celebration makes PRs feel special; trophies everywhere | Junk PRs (any rep count at any weight counts) | **Steal + improve**: user-selectable PR types |
| Finish → summary → share | Share cards (PR, muscle distribution) w/ 1-tap IG Stories export | — | **Steal as-is** — cheap viral loop |
| History & calendar | Calendar + monthly report + year-in-review | Free tier: only 3 months of graphs | **Steal as-is; don't gate history depth** |
| Profile & statistics | The signature muscle-group distribution charts, sets/muscle/week | Descriptive only — never says what to do next | **Steal + improve**: gap nudges ("hamstrings undertrained") — already in PRODUCT.md |
| Body measurements | Weight/BF/parts + progress photos | No nutrition (top user request) | Steal as-is |
| Social | Follow + feed + likes/comments; low-key accountability | **No clubs, challenges, or leaderboards at all** | Steal + improve: this is where Volt's Rivals wins |
| Settings | Per-workout privacy defaults, plate config, ~12 workout settings | — | Steal as-is |
| Pro paywall | Habit-first freemium: generous free tier, soft cap-triggered upsells ($2.99–5.99/mo) | 4-routine cap stings for PPL runners | **Steal the philosophy**; caps ≥6 |
| Watch app | Standalone wrist logging, live sync | Sync hiccups = #1 support topic | Defer for v1 |
| Widgets / Live Activities | Rest countdown + set ticking from lock screen | — | **Steal as-is** — huge in-gym UX |

**Hevy's top gaps**: offline, nutrition, prescriptive analytics, clubs/challenges, periodization.
**Threat note**: Hevy Trainer (Feb 2026) is adaptive programming — they are moving toward Volt's
v2 moat, strength-only. Our cross-modal version must be the answer.

## 2. Strava — flow catalog

| Flow | What works | What doesn't | Verdict for Volt |
|---|---|---|---|
| Onboarding | Usable in under a minute | Trial upsell before first activity; empty feed cold-start | **Steal + improve**: guided first record, paywall deferred |
| Record screen | 2025 redesign: map + live stats simultaneously; 30+ sports; **Beacon** live-location safety (free) | Android background-kill loses activities; GPS drift | **Steal + improve**: copy layout + free Beacon; make Android reliability an engineering pillar |
| Save/edit activity | Title/photos/gear/RPE/visibility; map trimming & hide-home | Privacy scattered, historically unsafe defaults (heatmap OSINT) | **Steal as-is + safe defaults + one privacy sheet** |
| Post-activity | Achievement density — PRs, top-3s, trophies on ordinary runs = the dopamine loop | Relative Effort built on bad 220-age HR defaults; errors cascade | **Steal + improve**: achievement density feeds the Vault; do HR zones right (LTHR) when HR lands |
| Feed | Chronological + 1-tap kudos (proven to increase running); auto-grouped shared activities | 2017 algorithmic feed revolt → reverted | **Steal as-is. Never ship an algorithmic feed** |
| Segments | The most addictive mechanic in fitness; Local Legends rewards consistency | 2020 leaderboard paywall backlash; cheating; junk segments | **Steal + improve**: segments *free* is a devastating wedge; integrity checks day one |
| Challenges & badges | Auto-tracked, zero-effort join, badge case | Repetitive; sponsor clutter | **Steal as-is** — proven retention, cheap |
| Clubs | Community layer; 1M+ clubs, extends streaks | Weak admin/event tooling | Steal + improve later (post-Rivals) |
| Profile & training log | Bubble-calendar training log is beloved | Was web-only for years | **Steal as-is, mobile-first** |
| Goals | Simple progress rings, 32 sports | Paywalled | Steal as-is, free |
| Fitness & freshness | Approachable CTL/ATL curve | Garbage-in from bad zones | Steal + improve — this is our unified-load chart with better inputs |
| Routes & heatmaps | Route builder on network-scale heatmap data | Needs scale we won't have; bias issues | Skip early; OSM + curation later |
| Premium gating | — | **Retro-paywalling (leaderboards '20, Year in Sport '25) + constant upsells = their biggest trust wound** | **Skip the strategy**: paywall only new value, never claw back |
| Year in Sport | Wrapped-style viral recap | Paywalled in 2025 → backlash | **Steal as-is, free forever** — it's acquisition |
| Athlete Intelligence (AI) | Beginner-friendly data translation | Generic for advanced users | Steal + improve: make it prescriptive (matches our advisory-coach plan) |

## 3. The prioritized take-and-beat list

**Tier 1 — into the v0.9/v1 wedge** (most already in PRODUCT.md; new items marked ★)
1. Hevy's logging trio verbatim (prefill + tick + auto rest timer, RPE, supersets, plate calc) — **beaten by being offline-first**, Hevy's #1 gap.
2. ★ **Live Activity / lock-screen**: rest countdown + tick sets without unlocking. Disproportionate in-gym value.
3. Exercise detail page = instructions + muscle map + history/charts/records tabs.
4. Finish → summary → share-card flow with one-tap IG Stories export.
5. Strava's record layout (map + stats together) + ★ **free Beacon-style safety sharing**; Android background reliability treated as a feature, not a bug class.
6. Strava's save/edit richness with **privacy-safe defaults** and one consolidated privacy sheet (map hide-home from day one).
7. Achievement density post-workout → routes into the Vault (already designed).
8. 90-second-to-first-log onboarding; no paywall existence in v1 at all.
9. ★ PR types user-configurable (kill Hevy's junk-PR annoyance).

**Tier 2 — v1.1 social**
10. Chronological feed + one-tap kudos + ★ auto-grouped "trained together" sessions.
11. Auto-tracked challenges + badge case; ★ **consistency crowns** (Local Legends' insight — reward showing up, not just being fast — folded into Rivals).
12. Rivals stays Volt-original: neither app has matched-rival competition. Segments-style addiction, minus the network-scale dependency.

**Tier 3 — later**
13. Training-log bubble calendar on profile · periodization rules in the routine builder (Hevy can't) · clubs with good admin tools · LTHR-correct HR zones when HR sources land · routes/heatmaps only when the data exists.

**Never-do list** (their scars, our guardrails)
- No algorithmic feed. No retro-paywalling — only ever gate *new* value. No upsell interstitials.
- No junk-PR spam. No public-by-default privacy. No paywalled year-in-review.

## 4. Reddit field notes (r/Hevy, r/Strava, r/whoop, r/Hyrox, r/HybridAthlete, r/Garmin)

**Thesis validation, verbatim from the market:** "Strava ignores my lifting, Hevy ignores my
running, nothing understands Hyrox prep" — recurring across r/HybridAthlete; people run
Hevy→Strava pipes, Strong+Runna, or literal Google Sheets, and complain about double-logging,
broken sync (a 1h lift arriving on Strava as 8 min), and no app understanding cross-discipline
fatigue. Hevy even blocks hardware sales ("my wife won't switch to Garmin because of Hevy").
Price anchor: ~$30/yr feels fair; one-app-for-both is what they'd pay for.

**Highest-scored feature wishes to absorb:** per-set rest timers (91 pts), warm-up auto-sort
(70), merge custom→library exercises (58), machine base-weight/assisted math in 1RM,
HR-zone time + distance-preset PBs (5K/10K) inside the lifting app, per-field share controls
(hide reps/photos when posting), and post-workout editability of *everything* (r/whoop's top
complaint, 69 pts).

**Design lessons:** dense beats airy (Strava redesigns mocked for "white space doing nothing" —
supports the instrument-panel direction); auto-generated share images get mocked unless
genuinely beautiful (Hevy's orange watermark heatmap); a muscle map that doesn't recalculate
after edits destroys trust.

**Unshipped ideas that fit Volt:** (1) cross-discipline scheduling intelligence (no heavy squats
the day before the long run — our v2 adaptive, demanded today); (2) **prospective load** — show
the predicted load of a planned session before starting it; (3) unified records screen mixing
1RM PRs and distance PBs (the Vault already does this — ship it as designed); (4) per-station
load attribution for Hyrox-style sessions (sprints/carries currently get zero strength credit
anywhere); (5) **transparent, user-correctable load** — show the formula, allow RPE calibration;
opaque wrong numbers are what killed trust in Whoop's metric.

**Retention datum:** static plans churn users at the 2–3 month mark (r/HybridAthlete) — the
progression/rivals loop is the retention answer, not canned programs.

### Competitive-layer validation (second Reddit pass, Sep 2026)

- **Competitor footprints:** HYBRD — tiny, part founder-self-promotion; liked by the few who
  found it, price questioned, zero competitive layer discussed. Edge — no organic Reddit
  presence at all. ROXFIT — real r/hyrox community; its **stickiest feature is age-group
  percentile comparison** (cohort standards = Volt's thesis, Hyrox-only). League of
  Fitness / Gym Rank (the ELO shells) — zero footprint: concept unvalidated by them, not
  disproven.
- **Users want competition — matched, fair, optional:** Hevy's 58-upvote clubs request wants
  gym-level boards scored on volume/frequency "to prevent cheats"; the global-leaderboard ask
  explicitly wants age/weight filtering; critics demand toggleability ("seeing how much heavier
  everyone lifts would be demotivating"). Strava shows the failure mode: all-time boards locked
  by pros/e-bikes/bogus entries = "competition is dying"; users themselves propose rolling
  windows, friends-only, and Local-Legends-style consistency crowns.
- **Zwift Racing Score = the working ELO precedent**, and its #1 gripe is **opacity** of point
  math (+18 for winning vs +151 for 2nd) plus bracket-gaming — confirming Volt's
  transparent-formula rule and the need for anti-sandbagging design.
- **Anti-requirements:** no all-time global leaderboards; police fake entries aggressively;
  every competitive surface toggleable; don't lead with "AI-driven" branding (instant churn
  signal in r/HybridAthlete); the rating only matters on top of credible unified tracking.

## 5. PRODUCT.md deltas applied

New adoptions folded into the plan: Live Activities/lock-screen logging (Loop 1), Beacon-style
safety sharing + record-screen layout (Loop 1), configurable PR types (Loop 3), consistency
crowns + auto-grouped sessions + chronological-feed guarantee (Loop 4), 90s onboarding target,
and the monetization guardrails (habit-first caps, never claw back).
