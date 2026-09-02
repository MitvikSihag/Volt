# Volt — Monorepo

One app for hybrid athletes (people who lift AND run): fast strength logging + GPS cardio +
a competitive rating layer (unified load, Volt Score, rivals, benchmarks) on one data model.

## Doc index — read what the task needs, nothing more
- [PRODUCT.md](PRODUCT.md) — product direction: positioning, four-loop feature map, releases,
  competitive landscape, community plan
- [RATINGS.md](RATINGS.md) — rating engine algorithm spec (ability layer + Glicko-2 ladder)
- [VOLT_DESIGN_SYSTEM.md](VOLT_DESIGN_SYSTEM.md) — design system v2: tokens, grammar rules,
  screen inventory, motion spec, navigation map
- [TEARDOWN.md](TEARDOWN.md) — Hevy/Strava flow teardown + Reddit research (steal / beat /
  never-do lists)
- [backend/ROADMAP.md](backend/ROADMAP.md) — backend phase content and conventions

## Repo structure
```
Volt/
├── backend/         — Java 21 + Spring Boot 3.5 REST API (see backend/CLAUDE.md).
│                      Shipped: Postgres+Flyway persistence, Docker, CI (required check on main)
├── web/             — Next.js 16. PAUSED — resumes post-launch as landing + companion
│                      (see web/CLAUDE.md). Do not build app features here.
├── mobile/          — Expo + React Native. THE primary product surface. Scaffolded Sep 2026;
│                      slice 1 (auth + Log loop) shipped (see mobile/CLAUDE.md)
└── design-screens/
    └── body-map/    — locked muscle-figure SVG asset (recolor only, never redraw)
```
Each subfolder has its own agent doc with stack-specific details. Start there when working in
that part of the codebase.

## Architecture & ground rules
- Backend exposes a REST API (JSON, JWT). The checked-in contract at
  `backend/docs/api/openapi.yaml` is the source of truth for all frontends — verification
  compares, never overwrites.
- Design pixels live in the Claude Design project "Volt - App Screens" (23 artboards);
  VOLT_DESIGN_SYSTEM.md is the written contract the code implements.
- `main` is protected: changes land via PR only; the `backend` CI check is required.
- Commit identity for this repo: `MitvikSihag <mitvik.sihag2003@gmail.com>` (personal, never the
  company GitHub account).
