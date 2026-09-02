# Volt — Monorepo

A combined Strava + Hevy fitness platform. One app for everything: cardio/GPS activity tracking (Strava-style) and strength training logging (Hevy-style).

## Repo Structure
```
Volt/
├── backend/    — Java 21 + Spring Boot REST API
├── web/        — Web frontend (stack TBD)
└── mobile/     — Mobile app (stack TBD)
```

Each subfolder has its own `AGENTS.md` with stack-specific details. Start there when working in that part of the codebase.

## What We're Building
A fitness app where users can:
- **Log strength workouts** — exercises, sets, reps, weight; track PRs and progression
- **Track cardio activities** — GPS runs/rides/hikes with maps, splits, segments
- **See analytics** — training load, volume trends, body stats over time
- **Connect socially** — follow friends, share activities, give kudos, join challenges

## Architecture
- **Backend** exposes a REST API (JSON, JWT auth)
- **Web and Mobile** are separate frontends that consume that API
- **API contract** lives at `backend/docs/api/openapi.yaml` — this is the source of truth for all frontends
- Base URL (dev): `http://localhost:8080`

## Planned Feature Scope
- User profiles, auth (register/login/JWT)
- Exercise library (system + custom exercises)
- Workout logging with progressive overload tracking
- GPS activity recording with route maps and lap splits
- Personal records and strength progression graphs
- Social graph (follow/followers, activity feed, kudos)
- Challenges and streaks
- Apple Health / Garmin / GPX integrations
- Nutrition logging (basic)
