@AGENTS.md

# Volt — Web Frontend

> **PAUSED (Sep 2026).** Per [PRODUCT.md](../PRODUCT.md) the product is mobile-first; web shrinks
> to landing page + read-only analytics companion, resumed post-launch. Don't build app features
> here — new product work goes to `mobile/`.

Web frontend for the Volt fitness platform. See the root `../CLAUDE.md` for the full product overview.

## Stack
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 (CSS-variables-based design tokens in `globals.css`)
- **Data fetching:** TanStack Query v5 (`@tanstack/react-query`)
- **Auth state:** Zustand (`lib/auth-store.ts`)
- **Charts:** Recharts
- **Maps:** Leaflet / react-leaflet (wired up once backend GPS data is available)
- **Icons:** Lucide React
- **HTTP client:** Axios (`lib/api.ts`)

## Project Structure
```
app/
├── page.tsx              — Landing page (marketing)
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
└── (app)/                — Protected app shell (sidebar layout)
    ├── dashboard/
    ├── workouts/
    │   ├── page.tsx      — Workout list
    │   ├── log/page.tsx  — Interactive workout logger (client component)
    │   └── [id]/page.tsx — Workout detail
    ├── activities/
    │   ├── page.tsx
    │   └── [id]/page.tsx — Activity detail (map + laps)
    ├── exercises/page.tsx
    ├── progress/page.tsx — Charts
    ├── social/page.tsx
    ├── profile/page.tsx
    └── settings/page.tsx

components/
├── ui/        — Primitive components (Button, Card, Input, Badge, Avatar, StatCard)
├── sidebar.tsx
├── providers.tsx
└── activity-map.tsx

lib/
├── api.ts        — Axios client + typed API functions + types
├── auth-store.ts — Zustand auth store
├── mock-data.ts  — Mock data (used until backend is ready)
└── utils.ts      — cn(), formatters (date, duration, distance, pace, weight)
```

## Design System
All tokens are CSS variables defined in `app/globals.css` under `@theme`:
- `--color-bg` / `--color-surface` / `--color-surface-2` — backgrounds
- `--color-border` / `--color-border-subtle` / `--color-border-strong` — borders
- `--color-accent` (#06B6D4 cyan) / `--color-accent-hover` / `--color-accent-muted` — brand accent
- `--color-text` / `--color-text-dim` (#A1A1B0) / `--color-text-muted` (#6B7280) / `--color-text-subtle` — text
- `--color-green` / `--color-blue` / `--color-red` / `--color-yellow` / `--color-purple` — semantic colors
- `--radius-sm` (6px) / `--radius-md` (8px) / `--radius-lg` (12px) / `--radius-xl` (14px) — border radii
- `--font-sans` (Inter) / `--font-display` (Syne) / `--font-mono` (JetBrains Mono) — type families

## API Contract
- Spec: `../backend/docs/api/openapi.yaml`
- Base URL (dev): `http://localhost:8080`
- Auth: `Authorization: Bearer <jwt>` (interceptor in `lib/api.ts`)
- All API types live in `lib/api.ts`

## Dev Setup
```bash
cd web
npm run dev    # http://localhost:3000
npm run build  # production build check
```

## Key Conventions
- Server Components by default; add `"use client"` only for interactivity/hooks
- `params` in dynamic routes is a `Promise<{ id: string }>` — always `await params`
- Mock data in `lib/mock-data.ts` stands in for all API calls until backend is running
- Use `cn()` from `lib/utils.ts` for conditional class merging
- Never expose raw API error messages to the UI — always catch and show user-friendly text
