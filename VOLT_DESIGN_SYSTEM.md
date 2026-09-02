# Volt — Design System & Build Spec
> Source-of-truth for all Volt design decisions. Lives in the repo root. Read top to bottom before scaffolding anything.

---

## 1. What Volt is

A fitness platform for athletes who both lift and do cardio. Strength logging and GPS cardio in one product, with cross-discipline analytics that show how the two interact.

**Target user:** Intermediate–advanced athletes — powerlifters in conditioning phases, runners who lift, CrossFitters, hybrid athletes. Not casual gym-goers.

**Tone:** Data-dense. Athletic. No fluff. Dense like Linear, social energy like Strava.

---

## 2. Two separate design contexts

Volt has two design modes — they are intentionally different.

### Marketing (landing page)
- `volt-landing.html` is the reference implementation
- Big type, hero sections, generous breathing room
- Job: convert a visitor into a signup
- Uses the same tokens but with editorial composition and whitespace

### App UI (all 13 screens)
- Dense, utilitarian, information-forward
- No hero sections, no marketing copy
- Sidebar nav on desktop, bottom tab bar on mobile
- Every pixel earns its place — this is a tool, not a brochure
- When in doubt: more data, less decoration

---

## 3. Shared design tokens

### Colors

```ts
// tailwind.config.ts
colors: {
  bg:              '#09090E',               // page background — lowest level
  card:            '#111118',               // surfaces, panels
  elevated:        '#1C1C28',               // raised elements, inputs, modals
  border:          '#2A2A3C',               // default borders
  'border-strong': '#3A3A50',               // hover/focus borders
  text:            '#F0F0F8',               // primary text — NEVER pure white
  'text-dim':      '#A1A1B0',               // secondary text
  muted:           '#6B7280',               // labels, placeholders, tertiary
  cyan:            '#06B6D4',               // brand accent, PRs, primary CTAs
  'cyan-dim':      'rgba(6,182,212,0.10)',   // subtle cyan backgrounds
  green:           '#22C55E',               // done/completed states ONLY
  blue:            '#3B82F6',               // cardio activities ONLY
  yellow:          '#EAB308',               // warmup sets, warnings
  red:             '#EF4444',               // failure sets, destructive actions
  purple:          '#8B5CF6',               // social avatars, accent variety
}
```

**Color rules:**
- **Cyan** = brand. PRs, active states, primary buttons, links.
- **Green** = done. Checked sets, completed goals. Never for emphasis.
- **Blue** = cardio. GPS routes, run/ride stats, cardio charts. Not for lifts.
- **Yellow** = warmup set type or caution state.
- **Red** = failure set type or destructive action. Never decorative.
- **Orange** = banned from Volt entirely. It reads as a competitor brand.
- Background hierarchy: `bg` → `card` → `elevated`
- Never use pure white text. Always `text` (#F0F0F8).

### Typography

```ts
fontFamily: {
  display: ['Syne', 'sans-serif'],          // headings, big numbers, brand name
  sans:    ['Inter', 'sans-serif'],          // all body and UI text
  mono:    ['JetBrains Mono', 'monospace'], // weights, reps, timers, all stats
}
```

**Type scale:**

| Name | Size | Weight | Family | Usage |
|---|---|---|---|---|
| display-xl | clamp(44px, 5.5vw, 78px) | 800 | Syne | Landing h1 |
| display-lg | clamp(34px, 4.5vw, 54px) | 800 | Syne | Section h2 |
| display-md | 22px | 700 | Syne | Page headers in app |
| display-sm | 19px | 700 | Syne | Card titles |
| display-num | 22–32px | 800 | Syne | Volume, PR numbers |
| body-lg | 17px | 400 | Inter | Landing subtitles |
| body-md | 15px | 400 | Inter | Body copy |
| body-sm | 13.5px | 400 | Inter | Secondary, nav |
| caption | 12px | 500 | Inter | Labels, chips |
| mono-stat | 11–13px | 500–600 | JetBrains | Weights, reps, timers, splits |
| eyebrow | 11px | 500 | JetBrains | Section labels (uppercase, 0.18em tracking) |

### Radii

| Value | Usage |
|---|---|
| 4px | Set type chips |
| 6px | Small badges |
| 8px | Buttons, nav items |
| 10–12px | Cards, inputs |
| 14px | Feature cards, PR banner |
| 18px | Bento grid cards |
| 28px | CTA box |
| 100px | Pills, badges |

### Borders
- Default: `1px solid #2A2A3C`
- Hover/focus: `1px solid #3A3A50`
- Accent/featured: `1px solid #06B6D4`

---

## 4. Logo

CSS clip-path lightning bolt, always cyan (#06B6D4):

```css
.logo-bolt {
  background: #06B6D4;
  clip-path: polygon(60% 0%, 100% 0%, 40% 50%, 80% 50%, 0% 100%, 20% 55%, -10% 55%);
}
```

Sizes: 22px (nav), 20px (app headers), 18px (footer).

---

## 5. App UI — layout

### Desktop
- Fixed left sidebar: 220px
- Main content: fluid
- Sidebar top: Logo
- Sidebar bottom: Avatar + settings icon

### Mobile
- No sidebar
- Bottom tab bar: 5 tabs — Home, Workouts, [Log — raised cyan FAB, center], Activities, Profile
- FAB: cyan, slightly elevated, 56px diameter

### Sidebar nav items
Dashboard · Workouts · Activities · Progress · Exercises · Profile

---

## 6. Core app component: the set row

The atom of the entire app. Used in workout logger, workout detail, exercise history.

```
[#] [Type chip] [Weight × Reps] [✓]
```

- Grid: `22px 60px 1fr 22px`, `gap: 8px`
- Padding: `7px 0`
- `border-bottom: 1px solid var(--border)` (none on last child)
- Set number: `muted`, weight 600, center-aligned
- Weight/reps: `font-mono`, `text` color. **Cyan** when set is a PR.

**Set type chips** (9px, uppercase, 4px radius, 2px 7px padding):

| Type | Background | Text |
|---|---|---|
| Warmup | rgba(234,179,8,0.15) | yellow |
| Normal | elevated | text-dim |
| Drop set | rgba(6,182,212,0.15) | cyan |
| Failure | rgba(239,68,68,0.15) | red |
| Superset | rgba(139,92,246,0.15) | #A78BFA |

**Checkmark states:**
- Empty: `border-strong` border, transparent bg
- Done: `green` bg + border, dark check icon
- PR: `cyan` bg + border, dark check icon

---

## 7. Live PR banner

The most important interaction in the app. Fires the instant a checked set beats any previous record.

- **Position:** fixed, horizontally centered, ~80px from top on mobile
- **Size:** 250px wide, 14px radius, 14px padding
- **Background:** `linear-gradient(135deg, #06B6D4 0%, #0891b2 100%)`
- **Shadow:** `0 12px 30px rgba(6,182,212,0.4)`
- **Contents:** medal SVG (36px) + "NEW PR · [EXERCISE]" (9.5px mono, uppercase, 0.15em) + value in Syne 14px bold + previous ("prev: 100kg × 5" 10px mono, opacity 0.7)
- **Animation:** scale 0.7→1.06→1, opacity 0→1, 0.6s ease
- **Auto-dismisses** after 3s or on tap
- **PR types tracked:** 1RM, heaviest weight, best set volume (weight × reps), most reps at a given weight

---

## 8. Landing page sections (in order)

All implemented in `volt-landing.html`. Sections:

1. **Nav** — fixed, frosted glass, collapses to hamburger on mobile (fully functional toggle)
2. **Hero** — split layout: copy left, dual phone mockup right. Lift phone (front/left, cyan accent), cardio phone (behind/right, blue accent). PR banner animates in after 1.2s.
3. **Trust strip** — thin bar: 48K+ workouts, 3.2M sets, 820K km, ratings, "Works offline", "Import from Strava & Hevy"
4. **How it works** — 3 numbered steps connected by a dashed line. On mobile: stacks vertically.
5. **Platform** — 2-col: three value pills left, dashboard preview card right. Chart uses cyan for lifts, blue for runs, gradient for both.
6. **Features bento** — 6-column grid with cascading stagger animation on scroll. All 9 cards have visual demos: PR card, set log, GPS map, bar chart, muscle heatmap, routine mini, exercise search, barbell/plates, rest timer countdown.
7. **Cross-discipline insights** — dual-axis line chart (squat 1RM cyan, running volume blue) with annotation callout at the dip. 3 insight cards: training balance donut, recovery sparkline, volume correlation stat.
8. **Community** — 2 feed cards (one strength/MK/cyan, one cardio/SP/purple with blue cardio badge). Avatar stack + "12,400 athletes tracking together" + community CTA link.
9. **CTA** — email waitlist with validation, confirmation state (green).
10. **Footer** — 3 columns: logo + tagline, product/company link groups, coming soon platform badges (App Store, Google Play, Apple Watch). Copyright spans full width below.

### Scroll reveal
- Sections use `.reveal` (fade + translateY 30px) or `.reveal-fade` (fade only for the trust strip)
- Class `.visible` added by `IntersectionObserver` at threshold 0.1
- Bento cards stagger in at 80ms per card via a separate observer

---

## 9. Screen-by-screen app specs

### Screen 1 — Landing page ✅ (see `volt-landing.html`)

### Screen 2 — Login / Register
- Centered form, `bg` background, logo at top
- Email + password or magic link
- OAuth: Apple (white button), Google
- Inline validation (red border + below-field message)

### Screen 3 — Dashboard
Top to bottom:
1. Greeting + streak chip
2. 4-column quick stat grid: Volume (kg), Workouts (X/Y), Distance (km), Active days
3. 7-day calendar strip with workout type icons
4. Active routine card: "Today: Push Day A" + Start button (cyan)
5. 14-day unified chart: cyan bars (lifts), blue bars (cardio), gradient (both)
6. Recent PRs: 3-card horizontal scroll
7. Social snippet: friends' activity + avatar stack

### Screen 4 — Workout list
Tabs: Routines / History / Templates
- **Routines:** card grid, name + exercise count + last performed + Start button
- **History:** newest-first list, date / name / duration / volume / PR count
- Floating cyan FAB: "+ New workout"

### Screen 5 — Workout logger ← MOST CRITICAL SCREEN
**Layout (mobile-first):**
- Sticky header: ← back, workout title (editable inline), elapsed timer (cyan mono), kebab menu
- Scrollable exercise list
- Each exercise = expandable card with set rows
- "+ Add exercise" button above tab bar
- Rest timer = bottom sheet, auto-appears on set check

**Exercise card:**
```
[Exercise name]               [⋯]
Last: 100kg × 5
──────────────────────────────────
SET  TYPE     WEIGHT  REPS  ✓
 1   Warmup   60kg    10    ✓ green
 2   Normal   100kg    5    ✓ green
 3   Normal   105kg    5    ✓ cyan (PR)
 4   Normal   —        —    □
[+ Add set]       [Notes] [Plate calc]
```

**Key interactions:**
- Tap empty set → numpad opens, last session pre-filled
- Tap checkmark → marks done (green), triggers rest timer, triggers PR detection
- PR detected → PR banner fires, checkmark turns cyan, PR saved to history
- Long-press set → contextual menu (change type, delete)
- Swipe left on set → delete
- Tap exercise name → bottom sheet: replace, view history, see graph, view muscle map

**Rest timer bottom sheet:**
- 36px mono countdown
- Skip / +30s / −30s buttons
- Pulse animation in final 10s
- Haptic on completion (mobile)

### Screen 6 — Workout detail
- Title, date, duration, total volume (large display-num, Syne 800)
- PR achievement banners (one per PR hit that session)
- Muscle distribution heatmap
- Per-exercise breakdown (collapsible)
- Share button → generates 1080×1920 shareable card

### Screen 7 — Activities list
Same structure as workout list but for cardio. Filter: Run / Ride / Hike / Swim / Other. Cards show map thumbnail, distance, time, pace.

### Screen 8 — Activity detail
- Full-bleed map (60vh)
- Stat strip: distance, time, pace, elevation, heart rate
- Splits table
- Achievement banners: best efforts, segments

### Screen 9 — Exercise library
- Search bar, filter chips (muscle, equipment, movement type)
- List: name + primary muscle + equipment icon
- Tap → detail: instructions, muscle map, your history chart, related exercises

### Screen 10 — Progress / Analytics
Period selector: week / month / 3M / year / all-time. Tabs:

- **Strength:** Volume chart (bar), 1RM progression per lift (line), muscle volume distribution (donut), frequency calendar heatmap
- **Cardio:** Distance/time chart, pace progression, elevation gain
- **Cross-discipline (Volt's unique value):** Correlation charts, recovery trends, training balance over time

### Screen 11 — Social feed
- Vertical scroll, mix of workouts and runs
- Filter: Following / Global
- Same activity card pattern as landing feed
- Pull to refresh

### Screen 12 — Profile
- Avatar, name, handle, bio, join date
- Stats: workouts, followers, following, current streak
- Tabs: Activity / PRs / Stats
- PRs tab: medal card grid per exercise

### Screen 13 — Settings
Sections: Account, Preferences (units: kg/lb — kg is default, rest timer defaults, weight increment), Notifications, Connected apps (Apple Health, Garmin, Wahoo), Privacy, About

---

## 10. Tech stack

```
Frontend:   Next.js 14 (App Router) + TypeScript + Tailwind CSS
Primitives: Radix UI (Dialog, Popover, Tabs, DropdownMenu, Toast)
Charts:     Recharts
Maps:       Mapbox GL JS
Icons:      Lucide React
State:      Zustand (client) + React Query (server cache)
Forms:      React Hook Form + Zod
Animation:  Framer Motion (component) + CSS (entry transitions)
Backend:    Supabase (Postgres + Auth + Storage + Realtime)
Mobile:     Expo / React Native (v2), or PWA + Capacitor
```

---

## 11. Folder structure

```
src/
  app/
    (marketing)/page.tsx          # landing page
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (app)/dashboard/page.tsx
    (app)/workouts/page.tsx
    (app)/workouts/[id]/page.tsx
    (app)/workouts/new/page.tsx   # logger — most important screen
    (app)/activities/page.tsx
    (app)/activities/[id]/page.tsx
    (app)/exercises/page.tsx
    (app)/progress/page.tsx
    (app)/social/page.tsx
    (app)/profile/[handle]/page.tsx
    (app)/settings/page.tsx
  components/
    ui/                           # Button, Card, Input, Badge, Chip, Avatar, Logo
    workout/
      ExerciseCard.tsx
      SetRow.tsx
      SetTypeChip.tsx
      RestTimer.tsx
      PRBanner.tsx
      PlateCalculator.tsx
    activity/
      ActivityCard.tsx
      RouteMap.tsx
    charts/
      VolumeChart.tsx
      OneRMChart.tsx
      MuscleHeatmap.tsx
      CrossDisciplineChart.tsx
    feed/
      FeedCard.tsx
      KudosButton.tsx
    layout/
      Sidebar.tsx
      MobileTabBar.tsx
      Logo.tsx
  lib/
    utils/pr-detection.ts
    utils/volume-math.ts
    utils/gps.ts
    hooks/useTimer.ts
    hooks/useWorkout.ts
  types/
    workout.ts
    activity.ts
    user.ts
```

---

## 12. Data model

```ts
User        { id, email, handle, name, avatar, bio, units, streak }
Exercise    { id, name, primaryMuscle, secondaryMuscles[], equipment, movementType, isCustom }
Routine     { id, name, ownerId, exercises: RoutineExercise[] }
Workout     { id, userId, name, routineId?, startedAt, completedAt, durationSec, totalVolumeKg }
WorkoutExercise { id, workoutId, exerciseId, order }
Set         { id, workoutExerciseId, setNumber, type, weightKg, reps, rpe?, completedAt, isPR }
Activity    { id, userId, type, startedAt, durationSec, distanceM, elevationM, avgPace, avgHr, routeGeoJson }
PR          { id, userId, exerciseId, type, value, setId?, achievedAt }
Follow      { followerId, followeeId }
Kudos       { id, userId, workoutId?, activityId? }
Comment     { id, userId, workoutId?, activityId?, text }
```

---

## 13. Build order

**Sprint 1:** Scaffold, tokens, component library, auth screens, landing page port

**Sprint 2:** Exercise library (seed 500 exercises), routine builder, workout logger — SetRow, PRBanner, RestTimer, PlateCalculator, PR detection logic

**Sprint 3:** Dashboard with unified chart, workout list + history, progress analytics

**Sprint 4:** GPS activity recording, activity list + detail, cardio analytics

**Sprint 5:** Social feed, follow/kudos/comments, profile, shareable card generator

---

## 14. Anti-patterns — never do these

- Use Inter for headings → Syne only
- Use pure white (#ffffff) text → always `#F0F0F8`
- Use **orange** anywhere → banned. No element on any screen.
- Show volume in lbs by default → kg is default; lb is a settings toggle
- Use generic icon-in-solid-square pattern → Volt icons use `cyan-dim` bg + 1px cyan border + cyan stroke
- Use a gradient background → gradients only on PR banner and CTA glow (functional, not aesthetic)
- Add a sidebar on mobile → bottom tab bar only
- Name or visually reference competitor apps anywhere in the product UI
- Auto-post workouts to social without explicit user opt-in
- Show marketing copy (hero sections, taglines) inside the app UI

---

## 15. First Claude Code prompt

Drop `volt-landing.html` and `VOLT_DESIGN_SYSTEM.md` in your project root, then run `claude` and use this as your first prompt:

> Read `VOLT_DESIGN_SYSTEM.md` and `volt-landing.html`. Scaffold a Next.js 14 app with TypeScript and Tailwind CSS using the color tokens, type scale, and folder structure from the spec. Set up all tokens in `tailwind.config.ts`. Build the base component library (Button, Card, Input, Badge, Chip, Avatar, Logo) in `src/components/ui/`. Then port the landing page from `volt-landing.html` into `src/app/(marketing)/page.tsx`, decomposed into the components listed in section 8 of the spec (Nav, Hero with dual phones, TrustStrip, HowItWorks, PlatformSection, FeaturesBento, CrossDisciplineSection, CommunitySection, CTA, Footer). Use Lucide React for all icons. Confirm the design system is wired correctly before moving on.
