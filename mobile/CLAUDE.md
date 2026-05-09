# Volt — Mobile App

Mobile frontend for the Volt fitness platform. See the root `../CLAUDE.md` for the full product overview.

## Stack
- **Framework:** React Native (Expo SDK 54) with Expo Router v6 (file-based routing)
- **Language:** TypeScript (strict)
- **State:** Zustand
- **Storage:** @react-native-async-storage/async-storage (offline queue)
- **Icons:** @expo/vector-icons (Ionicons)
- **Navigation:** Expo Router — `app/` directory, file-based, same conventions as Next.js

## Project Structure
```
mobile/volt-mobile/
├── app/
│   ├── _layout.tsx          — root stack
│   ├── index.tsx            — auth redirect
│   ├── (auth)/              — login, register
│   ├── (tabs)/              — home, log, record, feed, profile
│   ├── workout/active.tsx   — active workout modal
│   └── workout/exercise-picker.tsx
├── store/                   — Zustand stores (auth-store, workout-store)
├── lib/                     — mock-data, format helpers
├── components/theme.ts      — Colors, Typography, Spacing constants
└── types/index.ts           — shared TypeScript types
```

## Dev Setup
```bash
cd mobile/volt-mobile
npx expo start        # opens Expo Go QR
npx expo start --ios  # iOS simulator
npx expo start --android
```

## What This App Does
Native mobile experience for fitness tracking:
- Workout logging mid-gym (quick set entry, rest timer, plate calculator)
- GPS activity recording in the background (run/ride/hike tracking)
- Live map view during an activity
- Offline workout logging (sync when back online)
- Push notifications (rest timer, PR alerts, kudos from friends)
- Apple Health / Google Fit integration
- Camera for progress photos

## API Contract
The backend auto-generates an OpenAPI spec. Use it as the source of truth for all endpoints, request/response shapes, and auth.

- **Spec file:** `../backend/docs/api/openapi.yaml`
- **Base URL (dev):** `http://localhost:8080`
- **Auth:** `Authorization: Bearer <jwt>` header on all protected endpoints

## Key API Areas
| Area | Base path |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Workouts | `/api/workouts` |
| Exercises | `/api/exercises` |
| Activities | `/api/activities` |
| Users / Social | `/api/users`, `/api/feed` |

## Mobile-Specific Considerations
- Offline-first for workout logging — queue requests locally, sync on reconnect
- Background GPS tracking requires foreground service (Android) / background location permission (iOS)
- Minimize battery usage during activity recording (adaptive GPS polling)
- Rest timer should work with screen locked

