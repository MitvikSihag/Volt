# Volt Rating Engine — Algorithm Spec

> The implementable spec for the rating system designed in [PRODUCT.md §10](PRODUCT.md).
> Two layers: **Ability** (standards-based, moves every session) and **Rating** (the Glicko-2
> ladder, moves on evidence events). One headline number is displayed: the Rating. All formulas
> here are published in-app (the transparency rule). All constants live in versioned config —
> nothing hardcoded.

## 1. Layer A — Ability (per side, 0–1000)

### 1.1 Strength
For each lift, over a trailing evidence window (§1.3):

1. **e1RM** per set: Epley `w × (1 + r/30)`, valid only for `1 ≤ r ≤ 10` (reps >10 don't rate).
   Lift's evidence = best e1RM in window from a rated (plausibility-passed) set.
2. **Bodyweight normalization — allometric, per exercise**: the base formula is
   `norm = e1RM / BW^(2/3)` (strength scales with muscle cross-section ≈ mass^⅔) and applies to
   EVERY rated exercise. For squat/bench/deadlift, use the published IPF **DOTS** polynomial
   instead — the same allometric idea fitted to real population data, better behaved at extreme
   bodyweights. One normalizer per exercise, declared in config.
3. **Age**: `adj = norm × McCulloch(age)` (published masters/junior coefficients; 1.0 for 23–40).
4. **Percentile — one table per exercise, per sex**: `P = F_exercise,sex(adj)`. Bodyweight is
   already absorbed by step 2, age by step 3. Per-exercise tables are what make lifts
   comparable: "top 12% on bench" and "top 12% on deadlift" are the same achievement in
   different kilograms — so scores aggregate cleanly. (v1: hand-tuned tables for the big lifts
   + a default table per movement pattern for long-tail exercises; recalibrated from Volt's
   population quarterly once n is large enough. Long-tail/custom exercises with no table rate
   against their pattern default or don't rate — never against a wrong table.)
5. **Lift score**: `S_lift = clamp(500 + 160·probit(P), 0, 1000)`.
   Anchors: median → 500, top 10% → ~705, top 1% → ~873. (probit = inverse normal CDF.)

**Aggregation** — movement patterns, not muscles: squat / hinge / push / pull, weighted
30/30/20/20. Pattern score = best lift score in that pattern. Overall strength:
`S = weighted_mean(patterns with data) × (0.7 + 0.3 × n_patterns/4)` — the coverage factor stops
a one-lift specialist from posting a full strength score. Muscle-group scores (UI) = best lift
score touching that group; display-only, not part of S.

### 1.2 Endurance
1. Evidence: fastest efforts in window from **GPS-rated** activities only (manual entries log
   but never rate). Auto-extract best 1k/5k/10k efforts from streams.
2. **Distance normalization**: convert each to a 5k-equivalent via Riegel
   `t₂ = t₁ × (d₂/d₁)^1.06`; take the best equivalent.
3. **Age/sex normalization**: WMA age-grade % (published tables): `AG = WMA_std(sex, age, 5k) / t`.
4. **Percentile**: `P = F_end(AG)` from the endurance reference table (v1 hand-tuned: AG 50% →
   P≈0.40, 60% → ≈0.70, 70% → ≈0.90, 80% → ≈0.985; recalibrate later).
5. `E = clamp(500 + 160·probit(P), 0, 1000)`.

### 1.3 Evidence window (current form, not PR museum)
Evidence counts at full weight for 90 days, fades linearly to zero from day 90→180. Ability is
recomputed on every rated session; per-lift deltas ("Bench 642 → 651") are **ability-layer**
deltas and may show on the session summary.

### 1.4 Hybrid Ability
`H = √(S × E)` (geometric mean — imbalance is expensive by design). If a side has no rated
evidence: H is **incomplete** — display "needs a rated run/lift", never a fabricated number.

## 2. Layer B — Rating (the ladder, Glicko-2)

Standard Glicko-2, monthly rating period (= benchmark cycle). Constants: `τ = 0.5`,
initial volatility `σ₀ = 0.06`.

### 2.1 Seeding (no blind 1500)
`R₀ = 800 + 1.6 × H` (H∈[0,1000] → R₀∈[800,2400]).
`RD₀ = 350` if H incomplete or < 3 weeks of data; `250` otherwise.
**Provisional** while `RD > 180`: rating shown to the athlete with a "provisional" tag, hidden
from public boards (anti-sandbag + no early embarrassment).

### 2.2 Events (what counts as games)
- **Monthly Benchmark** (the big mover): within your division+variant field, you play a virtual
  game against each of up to 30 sampled same-division participants: win if your benchmark score
  is better, **draw if within 1%**. One benchmark ≈ up to 30 games — it dominates the month.
- **Rival duel** (weekly): 1 game vs your matched rival; win = higher weekly duel score
  (consistency + relative-improvement metric per the Rivals spec — cheat-resistant by
  construction, winnable by anyone).
- **Solo evidence games** (what lets sessions move the number honestly): a session that beats
  your expected performance (top-set e1RM or run AG above the ability-curve prediction) counts
  as **0.25 game won vs a virtual opponent rated = your own R**; underperforming ≥5% = 0.25
  game lost; else no game. Cap: net solo gain ≤ +15 rating per period without verification.
  This gives calibrated users small in-month movement and provisional users fast calibration,
  inside Glicko rather than around it.

### 2.3 Anchor & anti-inflation
- While `RD > 150`: after each period, `R ← R + 0.1 × (R_seed_now − R)` — uncalibrated ratings
  drift toward current ability; established ratings move only through events.
- Quarterly recentering: if pool-mean(R − seed) drifts, subtract the drift from everyone.
  Keeps 1842 meaning the same thing in year 2.

### 2.4 Inactivity
Per missed period: `RD ← min(350, √(RD² + 70²))` (confidence widens ~100→200 over ~6 months).
The number doesn't sag; certainty does. Re-entering provisional (RD>180) drops you from public
boards until you compete again.

### 2.5 Divisions & titles (percentile-banded, self-calibrating)
Active population = `RD ≤ 180` and activity in 90 days. Over that population:
Div 1 = top 10%, Div 2 = next 25%, Div 3 = next 35%, Div 4 = rest.
Titles = finer percentile bands (top 1 / 5 / 15 / 35 / 65 / 100) — names TBD with branding.
Cutoffs recomputed at period close with ±1% hysteresis (no flapping). Benchmark variants are
per-division (scaled loads/duration) — legal because Glicko compares within-field only.

### 2.6 Verification gates (from PRODUCT.md — enforcement points)
- Rating-affecting cardio requires GPS + HR-pace-cadence plausibility.
- Benchmark results implying performance > ability seed by 2σ → quarantined (rating delta held)
  pending verification.
- Ranking into Div 2+ (beta: above Div 3) requires the video/verification standard.

## 3. Worked examples

**Bench case** (from the founder's question): 50 kg lifter benching 85 (e1RM 85×1 = 85 if
single): DOTS ≈ 85 × 1.14 ≈ 96.9 → suppose P = 0.88 → S_lift ≈ 500+160(1.17) ≈ 688.
100 kg lifter benching 100: DOTS ≈ 100 × 0.735 ≈ 73.5 → P ≈ 0.55 → ≈ 520. If the second is 52:
McCulloch 1.204 → adj 88.5 → P ≈ 0.78 → ≈ 624. Lighter/younger lifter still ahead; the gap is
honest. *(DOTS coefficients illustrative — implementation uses the published polynomial.)*

**Benchmark**: athlete R=1712, RD=120, Div 2 field of 41 → 30 sampled games, finishes 12th →
~21 wins, 2 draws, 7 losses vs expectation ~60% → Glicko yields ≈ +38 → card reads
"1750 · Div 2 · ↑38 this month".

## 4. Period-close pseudocode

```
for each athlete A active this period:
    games = benchmark_games(A) + duel_games(A) + solo_games(A)   # §2.2
    (R, RD, σ) = glicko2_update(A.R, A.RD, A.σ, games, τ=0.5)
    if A.RD > 150: R += 0.1 * (seed(A) - R)                      # §2.3
for each inactive athlete: RD = min(350, sqrt(RD² + 70²))        # §2.4
recompute division/title cutoffs over active pool (±1% hysteresis)
apply promotions/relegations; emit rating cards
```

## 5. Data & tables (versioned config, never code)
DOTS polynomial coefficients · McCulloch/Foster table · WMA 5k standards · strength percentile
tables per lift (v1 hand-tuned, source TBD — the one open item) · endurance AG→P table ·
all §2 constants. Every change bumps a config version stored with each rating update (full
auditability — required for the in-app "how your rating moved" transparency page).

## 6. Calibration plan & tunables
Before launch: simulate the period-close on synthetic athletes (spread of H, random benchmark
noise) and verify: (a) provisional convergence ≤ 2 benchmarks, (b) no runaway inflation over 12
simulated months, (c) solo-game cap binds. Tunables to revisit with real data: 160 (probit
scale), coverage factor, draw band 1%, 30-game sampling, 0.25 solo weight, +15 cap, RD growth
70, anchor 0.1. Quarterly: refit percentile tables from Volt's own population.
