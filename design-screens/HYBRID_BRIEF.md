# Hybrid App Screens — Upgrade Brief (v2 → v3)

> For the Claude Design project "Hybrid athlete training app". Grounded in
> [TEARDOWN.md](../TEARDOWN.md) (Hevy × Strava flow verdicts) and the screen review.
> Each item has a paste-ready prompt for the project chat. Fire them ONE at a time —
> batch-prompting a design agent degrades quality.

## A. Global fixes (do these first — they touch every screen)

**A0 — Brand it as Volt. The project currently has no app identity.**
The screens say "Hybrid"; the product is **Volt**. The mark is the lightning bolt (design-system
§4). One brand-color exception to the "color only touches data" rule is normal (Spotify's green
logo) — the bolt wears the ember accent; everything else in chrome stays grayscale.
> Prompt: "Brand the app as VOLT throughout: app name 'Volt' wherever 'Hybrid' appears; add the
> bolt mark + wordmark to the Today header (small, top-left) and design an app icon + splash
> artboard (bolt on #121212). The bolt is this exact SVG, in ember #FF5A1F, never redrawn:
> `<svg viewBox='0 0 20 24' xmlns='http://www.w3.org/2000/svg'><polygon points='12 0,20 0,8 12,16 12,0 24,4 13,0 13' fill='#FF5A1F'/></svg>`
> Wordmark: VOLT in the heading face, bold, letter-spacing 0.04em, always next to the bolt."

Also paste the body-map asset in now — the muscle-map screen is stubbed waiting for it. The file
is [body-map/volt-body-map.svg](body-map/volt-body-map.svg) in this folder (see A3 for the
recolor instructions).

**A1 — Load vs Rating must look different.**
Load 842 and Rating 1842 rhyme dangerously; today they share typography.
> Prompt: "Establish a global rule: RATING numbers always render with the tier color and a small
> tier chip beside them (e.g. 1842 + 'Contender'), LOAD numbers always plain white with a small
> 'LOAD · 7 DAYS' caption. Apply on Rivals, Profile, Friends, Feed — no unlabeled big numbers
> anywhere."

**A2 — One muscle taxonomy everywhere.**
Profile uses 4 regions (posterior/quads/push/aerobic), Muscle Map uses 10.
> Prompt: "Unify all muscle breakdowns to the 10-region taxonomy: glutes·hams, quads, lats·traps,
> forearms·grip, core, calves, biceps, chest, delts, triceps. Aerobic is not a muscle row — give
> aerobic volume its own separately-styled row wherever it appears."

**A3 — Replace the body model with the locked asset.**
The asset lives at `design-screens/body-map/volt-body-map.svg` — a tiled, mirrored, 10-region
figure that recolors via CSS variables (`--vol-quads` etc.). Paste its source into the design and
never let the agent redraw anatomy again.
> Prompt: "Replace the muscle-map body illustration on 07 Profile with this exact SVG, unmodified
> except fills: [paste SVG]. Color regions by setting the CSS variables per the volume ramp.
> Do not redraw or restyle its paths."

**A4 — Fix the two review nits**: profile right-edge clipping ("84t lifted"), and the "Add a
photo" dashed box rendering inside Mara's post on Feed (it must be its own composer block).

**A5 — Density pass: several screens are content-heavy. One primary focus per screen.**
> Prompt: "Do a density pass across all screens with this rule: each screen has ONE primary
> module that owns the fold, at most two supporting modules visible, and everything else behind
> a tap (expandable section or bottom sheet). Apply concretely: Today — readiness collapses to a
> single line under the title, session preview shows 3 exercises + 'x more'; Rivals — load board
> shows top 3 + 'show all'; Profile — calendar becomes a compact strip that expands on tap;
> History — collapse per-session tag rows into the card. Whitespace is not wasted space; when in
> doubt, cut a module, don't shrink it."

## B. Upgrades to existing screens (teardown-driven)

**02 Live Lift**
> Prompt: "Add to the live lift screen: (1) a small plate-calculator affordance next to the
> weight stepper; (2) a companion artboard showing the LOCK SCREEN Live Activity — rest countdown,
> current exercise, next set, tick-set button — same visual language, iOS lock-screen context
> (real system chrome may be absent, do not fake the clock)."

**03 Live Run**
> Prompt: "Add a subtle 'Beacon on — live location shared with 2 people' indicator row to the
> live run screen, and confirm map + live stats always share the screen (never a stats-only
> mode)."

**04 Feed**
> Prompt: "Feed: make kudos one-tap with a satisfying pressed state; add one example of a
> 'Trained together' auto-grouped card (two athletes, one session, shared map/volume); move the
> photo composer out of other people's posts into its own block at top."

**05 Rivals**
> Prompt: "Add a 'Consistency crown' element to Rivals: whoever in your rival pair/leaderboard
> has the most active days this month wears a small crown — reward showing up, not just output."

**07 Muscle Map (Profile, scrolled)**
> Prompt: "Under the muscle map, add a GAP callout row: e.g. 'Hamstrings — 1 session in 4 weeks'
> in caution yellow. Show what was NOT trained, not just what was."

## C. New screens to make (agreed order — paste one prompt at a time)

> **STATUS: ALL SEVEN SHIPPED (2 Sep 2026).** The project now holds 23 artboards (01–22 +
> splash): C1 → 10 Finish / 11 Summary / 12 Share + true-size story card; C2 → 13 Exercise
> Charts / 14 Records; C3 → 15 The Vault; C4 → 16 Save+Edit / 17 Privacy sheet; C5 → 18–20
> Onboarding; C6 → 21 Challenges+Badges; C7 → 22 Settings. Prompts kept below for reference /
> future revision rounds.

**C1 — Workout Finish → Summary → Share** (2–3 artboards; the loop-closer)
> Prompt: "C1: Workout Finish → Summary → Share as new artboards. Summary: the LOAD EARNED this
> session is the one number that owns the screen (vs its prospective estimate if planned);
> below, quiet rows: duration, volume, muscle chips with set counts, PRs/medals won, and the
> rating delta with tier chip ('Volt rating 1842 → 1873'). Then Share: a 1080×1920 share-card
> preview — dark, mono numbers, the session's signature graphic (set table for lifts, route
> line for runs) — genuinely beautiful or nothing; plus per-field share toggles (hide reps /
> photos / load) and one-tap Story export. Same grammar: grayscale chrome, ember/jade data."

**C2 — Exercise Detail** (Hevy's best page, stolen structurally)
> Prompt: "C2: Exercise Detail screen. Header: exercise name, muscle chips, equipment,
> measurement type. The one number: current e1RM with its rating ('Bench 105kg e1RM · 642').
> Tabs: About (instructions + which body-map regions it hits) · History (past sessions) ·
> Charts (e1RM trend, heaviest set, volume) · Records (PRs with dates + club progress bar).
> Mono numerals, one chart per tab view, no dashboard grammar."

**C3 — The Vault** (records across BOTH sports — nobody ships this)
> Prompt: "C3: The Vault. A medal wall mixing modalities: kg Clubs per lift, cardio best
> efforts (5K/10K/half PBs), streak charges, volume weeks, rating milestones. Locked medals
> show live progress ('120 kg Club — 15 kg to go, ring 88% lit'). Gold = earned only. Header
> frames everything by cohort percentile ('top 12% of Hyrox men 30–34'), never global rank."

**C4 — Save/Edit Activity + Privacy Sheet**
> Prompt: "C4: Save/Edit Activity screen + its privacy bottom sheet. Save: auto-suggested
> title, photos, perceived effort, visibility. ONE consolidated privacy sheet: map trim,
> hide start/end, hide-home (default ON), per-field share defaults. Everything on this screen
> is editable after the fact — design an edit state, not just a create state."

**C5 — Onboarding** (3 artboards)
> Prompt: "C5: Onboarding, three artboards: (1) one goal question (race/event or general +
> date) seeding a starter plan; (2) the seeded week preview; (3) first set being logged.
> Target feel: ≤90 seconds from open to first logged set. Zero paywall, zero account-wall
> before value, no feature tour. Volt bolt on the first artboard only."

**C6 — Challenges & Badges**
> Prompt: "C6: Challenges screen. Join-in-one-tap monthly challenges with auto-tracked
> progress bars; a consistency crown challenge (most active days — winnable by anyone);
> rolling time-window boards only, never all-time; badge trophy case below. Every competitive
> element visibly toggleable (small 'hide' affordance)."

**C7 — Settings**
> Prompt: "C7: Settings. Sections: Units (kg default, lb toggle) · Rest timer defaults ·
> Plate config (bar + available plates) · PR types (toggle which PR kinds count — no junk-PR
> spam) · Privacy defaults (per-field share controls) · Competition (toggle rivals/leaderboards
> visibility) · Connected apps (Apple Health, Garmin, Strava import) · About. Dense list
> grammar, grayscale, no cards."

## D. Never-do guardrails (repeat these to the design agent when relevant)

No algorithmic feed indicators ("suggested for you"). No upsell interstitials or locked-feature
teasers in v1 screens — there is no paywall. No fake iOS status bars or keyboards. No orange…
unless the palette decision is now final — in which case update VOLT_DESIGN_SYSTEM.md first so
the docs stop contradicting the screens.
