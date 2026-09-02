# Designer Brief — Volt App Screens (2–13)

**Context:** You are designing the app UI screens for Volt (screens 2–13 from VOLT_DESIGN_SYSTEM.md). The landing page is done — `volt-landing.html` is the reference. All design tokens, color rules, typography, and anti-patterns are in `VOLT_DESIGN_SYSTEM.md`. Read it top to bottom before starting.

## Priority order

1. **Screen 5** — Workout Logger (most critical, most complex — get this right first)
2. **Screen 3** — Dashboard
3. **Screen 2** — Login / Register (already close, just needs OAuth buttons + cyan accent update)
4. **Screen 9** — Exercise Library
5. **Screen 4** — Workout List
6. **Screen 6** — Workout Detail
7. Remaining screens in any order

## Rules — follow strictly

- Design **mobile-first** (390px), then desktop (1440px with 220px sidebar). No tablet-specific layout.
- Desktop uses a fixed left sidebar (220px). Mobile uses a bottom tab bar with a raised cyan FAB in the center for "Log workout."
- All headings use **Syne** (700–800 weight). Never Inter for headings. All body text uses Inter. All numbers/stats/weights/timers use **JetBrains Mono**.
- The **set row** (Section 6 of the spec) is the atom of the app. Get this pixel-perfect: `22px 60px 1fr 22px` grid, mono font for weights, colored chips for set types, three checkmark states (empty, green done, cyan PR).
- The **PR banner** (Section 7) is the most important moment in the app. Follow the spec exactly: gradient background, medal SVG, scale animation, auto-dismiss. This must feel celebratory.
- The **rest timer** should be a bottom sheet that auto-appears when a set is checked. Large mono countdown, +30s/−30s/Skip buttons, pulse in final 10 seconds.
- Use `bg → card → elevated` background hierarchy consistently. Cards are `#111118` with `#2A2A3C` border.
- Icons follow the Volt pattern: cyan-dim background + 1px `rgba(6,182,212,0.3)` border + cyan stroke. No solid-fill icon squares.
- **No orange. Anywhere. Ever.**
- Volume always defaults to **kg**, not lbs.
- No marketing copy inside app screens — no taglines, no hero sections, no "welcome to Volt" banners. The app is a tool.

## Workout Logger (Screen 5) — specific requirements

- Sticky header with back arrow, editable workout title, elapsed timer (cyan, JetBrains Mono), kebab menu
- Each exercise is a collapsible card containing set rows
- Empty sets show dashes (—) for weight and reps with an empty checkmark
- Tap checkmark → green (done), triggers rest timer, triggers PR check
- PR detected → checkmark turns cyan, PR banner fires
- "+ Add set" and "+ Add exercise" buttons clearly visible
- Notes and Plate Calculator are secondary actions below each exercise's sets
- Swipe-to-delete on sets (mobile)

## Deliverable format

Each screen as a standalone HTML file (same pattern as `volt-landing.html`) using the shared `:root` tokens. Name them: `volt-screen-{number}-{name}.html` (e.g., `volt-screen-05-workout-logger.html`).

Copy the `:root` token block from `volt-landing.html` directly so values don't drift between screens.
