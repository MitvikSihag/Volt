# Volt — Mobile

The primary product surface (see root [PRODUCT.md](../PRODUCT.md): mobile-first, web is
marketing + companion). Not yet scaffolded — this doc seeds the scaffold and grows with it.

## Stack (decided)
- **Expo + React Native + TypeScript** (Expo Router for navigation)
- API: consumes the backend REST API; the contract at `backend/docs/api/openapi.yaml` is the
  source of truth — generate the client/types from it, never hand-write shapes
- State/server-cache and other library picks: decided at scaffold time, recorded here

## Product constraints that shape the code
- **Offline-first logging is the wedge** (Hevy can't do it). The strength logger must work with
  no connection: local queue → sync. Design data flow around this from day one.
- Logging speed is sacred: ≤2 taps per set, previous-session prefill, one action in the thumb zone.
- kg is the default unit everywhere; lb is a settings toggle.
- Measurement type comes from the Exercise config (`REPS_WEIGHT` / `DISTANCE` / `DURATION` /
  `REPS_ONLY`) — the set-entry UI renders from it.
- GPS recording must survive backgrounding (Android reliability is a feature, not a bug class).
- Live Activity / lock-screen (rest countdown + tick sets) is v1 scope, not polish.

## Design source of truth
The Claude Design project "Volt - App Screens" (dc.html file) owns the screens; its system:
base `#121212` darkness ladder, ember `#FF5A1F` = strength, jade = endurance, gold = earned
rewards only, yellow = gaps, mono numerals, grayscale chrome, tier chips on ratings,
one-number-owns-each-screen. Muscle figure: `design-screens/body-map/volt-body-map.svg`
(locked asset — recolor via CSS variables, never redraw). Do not invent screens; port them.

## IA (tabs)
Today (goal-anchored) · Plan · Feed · Rivals · Profile (Vault, muscle map, ratings).
Ad-hoc logging reachable from Today without a plan.

## Release scope
v0.9 alpha: auth, strength logger, GPS recording, history, Events/Today.
See [PRODUCT.md §7](../PRODUCT.md) for the full ladder and gates.
