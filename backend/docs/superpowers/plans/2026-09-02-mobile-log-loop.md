# Mobile slice 1 — foundation + Log loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fresh Expo app where a logged-in athlete starts a session from Today, logs sets on Live Lift with no network, finishes with an RPE, saves once, and sees the Summary.

**Architecture:** Expo Router app; TanStack Query (persisted to AsyncStorage) for reads; one persisted Zustand store as the source of truth for the active session; pure reducer functions for all session logic; one nested `POST /api/workouts` on Save. Types generated from the checked-in OpenAPI contract.

**Tech Stack:** Expo SDK 57, Expo Router 57, React Native 0.87, TypeScript strict, `@tanstack/react-query` 5, `zustand` 5, `openapi-fetch` + `openapi-typescript`, `expo-secure-store`, `expo-linear-gradient`, `@expo-google-fonts/inter` + `jetbrains-mono`, `jest-expo`.

**Spec:** `docs/superpowers/specs/2026-09-02-mobile-log-loop-design.md`

## Global Constraints

- App lives in `mobile/volt-mobile/`; the existing scaffold there is deleted first. `web/` is never touched.
- Surfaces `#121212` base · `#0D0D0D` sunken · `#171717` raised · `#000000` hero. Ember `#FF5A1F` strength, jade `#31A98D` endurance, gold `#D9B45B` earned only. Text ramp `#FAFAFA / #A8A8AA / #6E6E70`. No cards, borders, shadows, glows.
- Numerals/metadata JetBrains Mono; headings/body Inter. Metadata = 11 px mono uppercase letter-spaced, never a heading.
- Numbers with no backend are omitted, never faked.
- Backend dev URL `http://localhost:8080` (H2 profile, `cd backend && ./gradlew bootRun`). Override with `EXPO_PUBLIC_API_URL`.
- Commits on branch `feat/mobile-log-loop`, identity `MitvikSihag <mitvik.sihag2003@gmail.com>`, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Session data is never lost: every failure path keeps the store intact.

---

### Task 1: Scaffold, tokens, primitives, root layout

**Files:**
- Delete: `mobile/volt-mobile/` (entire old scaffold)
- Create: `mobile/volt-mobile/` via create-expo-app, then `src/ui/tokens.ts`, `src/ui/primitives.tsx`, `app/_layout.tsx`, `app/index.tsx`, `jest.config.js`, `.env.example`
- Modify: `package.json` scripts, `app.json`, `tsconfig.json`

**Interfaces:**
- Produces: `color`, `font`, `space` from `src/ui/tokens`; `Numeral`, `Meta`, `Mono`, `Body`, `Heading`, `Zone`, `Hairline`, `Button`, `Stepper`, `TierChip`, `HeaderWash` from `src/ui/primitives`.

- [ ] **Step 1: Replace the scaffold**

```bash
cd mobile && rm -rf volt-mobile && npx --yes create-expo-app@latest volt-mobile --template blank-typescript --no-install && cd volt-mobile
npx expo install expo-router expo-linking expo-constants expo-status-bar expo-secure-store expo-linear-gradient expo-font react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated @react-native-async-storage/async-storage @expo-google-fonts/inter @expo-google-fonts/jetbrains-mono
npm i @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister zustand openapi-fetch
npm i -D openapi-typescript jest-expo jest @types/jest
```

- [ ] **Step 2: package.json scripts, app.json, tsconfig**

`package.json` → set `"main": "expo-router/entry"` and scripts:
```json
"scripts": {
  "start": "expo start",
  "ios": "expo start --ios",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "gen:api": "openapi-typescript ../../backend/docs/api/openapi.yaml -o src/api/schema.d.ts"
}
```
`app.json` `expo` block: `"name": "Volt"`, `"slug": "volt"`, `"scheme": "volt"`, `"userInterfaceStyle": "dark"`, `"backgroundColor": "#121212"`, splash `"backgroundColor": "#121212"`, `"plugins": ["expo-router", "expo-font", "expo-secure-store"]`, `"ios": {"bundleIdentifier": "app.volt.mobile", "supportsTablet": false}`, `"android": {"package": "app.volt.mobile"}`.

`tsconfig.json`:
```json
{ "extends": "expo/tsconfig.base", "compilerOptions": { "strict": true, "paths": { "@/*": ["./src/*"] } }, "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"] }
```
`jest.config.js`:
```js
module.exports = { preset: 'jest-expo', testMatch: ['**/src/**/*.test.ts'] };
```
`.env.example`: `EXPO_PUBLIC_API_URL=http://localhost:8080`

- [ ] **Step 3: tokens**

`src/ui/tokens.ts`
```ts
export const color = {
  base: '#121212', sunken: '#0D0D0D', raised: '#171717', hero: '#000000',
  ember: '#FF5A1F', jade: '#31A98D', gold: '#D9B45B', yellow: '#E5C04B',
  t1: '#FAFAFA', t2: '#A8A8AA', t3: '#6E6E70', hairline: '#242424',
} as const;
export type Tone = 't1' | 't2' | 't3' | 'ember' | 'jade' | 'gold' | 'yellow';
export const font = {
  sans: 'Inter_400Regular', sansMed: 'Inter_500Medium', sansSemi: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular', monoMed: 'JetBrainsMono_500Medium', monoBold: 'JetBrainsMono_700Bold',
} as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
```

- [ ] **Step 4: primitives**

`src/ui/primitives.tsx`
```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, PressableProps, StyleSheet, Text, TextProps, View, ViewProps } from 'react-native';
import { color, font, Tone } from './tokens';

type T = TextProps & { tone?: Tone; size?: number };

export const Numeral = ({ tone = 't1', size = 96, style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.monoBold, fontSize: size, lineHeight: size * 1.05, color: color[tone], letterSpacing: -size * 0.04 }, style]} />
);
export const Meta = ({ tone = 't3', style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.mono, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: color[tone] }, style]} />
);
export const Mono = ({ tone = 't1', size = 15, style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.mono, fontSize: size, color: color[tone] }, style]} />
);
export const Body = ({ tone = 't1', size = 15, style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.sans, fontSize: size, lineHeight: size * 1.4, color: color[tone] }, style]} />
);
export const Heading = ({ tone = 't1', size = 28, style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.sansSemi, fontSize: size, lineHeight: size * 1.15, letterSpacing: -0.5, color: color[tone] }, style]} />
);
export const Zone = ({ level = 'base', style, ...p }: ViewProps & { level?: 'base' | 'sunken' | 'raised' | 'hero' }) => (
  <View {...p} style={[{ backgroundColor: color[level] }, style]} />
);
export const Hairline = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.hairline }} />;

export const Button = ({ label, tone = 'primary', disabled, ...p }: PressableProps & { label: string; tone?: 'primary' | 'ghost' }) => (
  <Pressable {...p} disabled={disabled} style={({ pressed }) => ({
    height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: tone === 'primary' ? color.t1 : color.raised, opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
  })}>
    <Text style={{ fontFamily: font.sansSemi, fontSize: 16, color: tone === 'primary' ? color.sunken : color.t1 }}>{label}</Text>
  </Pressable>
);

export const Stepper = ({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) => (
  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 24, backgroundColor: color.raised, paddingHorizontal: 4 }}>
    <Pressable onPress={onMinus} hitSlop={8} style={{ width: 44, alignItems: 'center' }}><Mono tone="t2" size={18}>−</Mono></Pressable>
    <Meta style={{ flex: 1, textAlign: 'center' }}>{label}</Meta>
    <Pressable onPress={onPlus} hitSlop={8} style={{ width: 44, alignItems: 'center' }}><Mono tone="t2" size={18}>+</Mono></Pressable>
  </View>
);

export const TierChip = ({ label, tone = 'ember' }: { label: string; tone?: Tone }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: color[tone] + '1F' }}>
    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color[tone] }} />
    <Meta tone={tone}>{label}</Meta>
  </View>
);

export const HeaderWash = ({ tone = 'ember', height = 280 }: { tone?: 'ember' | 'jade'; height?: number }) => (
  <LinearGradient pointerEvents="none" colors={[color[tone] + '2E', color[tone] + '00']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height }} />
);
```

- [ ] **Step 5: root layout + index (auth gate wired in Task 2; here it only shows fonts work)**

`app/_layout.tsx`
```tsx
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { color } from '@/ui/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: 24 * 60 * 60 * 1000, staleTime: 60 * 1000, networkMode: 'offlineFirst', retry: 1 },
    mutations: { retry: 2 },
  },
});
const persister = createAsyncStoragePersister({ storage: AsyncStorage });

export default function RootLayout() {
  const [fontsReady] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold });
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: color.base }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.base }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.base }, animation: 'fade', animationDuration: 200 }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout/live" options={{ presentation: 'modal', gestureEnabled: true }} />
          <Stack.Screen name="workout/picker" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workout/finish" options={{ presentation: 'card', gestureEnabled: false }} />
          <Stack.Screen name="workout/summary" options={{ presentation: 'card', gestureEnabled: false }} />
          <Stack.Screen name="profile" />
        </Stack>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
```
`app/index.tsx` (temporary until Task 2 adds the gate):
```tsx
import { Redirect } from 'expo-router';
export default function Index() { return <Redirect href="/(tabs)" />; }
```
`app/(tabs)/_layout.tsx` and `app/(tabs)/index.tsx` minimal so the app boots:
```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
export default function TabsLayout() { return <Tabs screenOptions={{ headerShown: false }} />; }
```
```tsx
// app/(tabs)/index.tsx
import { Zone, Numeral, Meta } from '@/ui/primitives';
export default function Today() { return <Zone style={{ flex: 1, padding: 24, justifyContent: 'center' }}><Numeral>842</Numeral><Meta>fonts loaded</Meta></Zone>; }
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck` → no errors. Run: `npx expo start --ios` (or the Simulator tool) → dark screen, `842` in JetBrains Mono bold, meta line in mono caps.

- [ ] **Step 7: Commit**

```bash
git add mobile/volt-mobile && git commit -m "feat(mobile): fresh Expo scaffold with design tokens and primitives"
```

---

### Task 2: API types, client, auth store, auth screens, gate

**Files:**
- Create: `src/api/schema.d.ts` (generated), `src/api/client.ts`, `src/auth/store.ts`, `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/profile.tsx`
- Modify: `app/_layout.tsx` (auth hydrate + gate), `app/index.tsx`

**Interfaces:**
- Produces: `api` (openapi-fetch client), `unwrap(promise)`, `BASE_URL`; `useAuth` store with `accessToken`, `hydrated`, `hydrate()`, `login(usernameOrEmail, password)`, `register(username, email, password)`, `refresh(): Promise<boolean>`, `logout()`; `errorMessage(res)`.

- [ ] **Step 1: Generate types**

Run: `npm run gen:api` → `src/api/schema.d.ts` exists with `paths` and `components`. Add `src/api/schema.d.ts` to git (regenerate whenever the contract changes).

- [ ] **Step 2: auth store**

`src/auth/store.ts`
```ts
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
const KEY = { access: 'volt.access', refresh: 'volt.refresh' };

type Tokens = { accessToken: string; refreshToken: string };
type AuthState = {
  accessToken: string | null; refreshToken: string | null; hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
};

export async function errorMessage(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j?.errors?.[0]?.message ?? j?.message ?? `Request failed (${res.status})`;
  } catch { return `Request failed (${res.status})`; }
}

async function postAuth(path: string, body: unknown): Promise<Tokens> {
  const res = await fetch(BASE_URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

let inflightRefresh: Promise<boolean> | null = null;

export const useAuth = create<AuthState>((set, get) => {
  const store = async (t: Tokens) => {
    await Promise.all([SecureStore.setItemAsync(KEY.access, t.accessToken), SecureStore.setItemAsync(KEY.refresh, t.refreshToken)]);
    set({ accessToken: t.accessToken, refreshToken: t.refreshToken });
  };
  return {
    accessToken: null, refreshToken: null, hydrated: false,
    hydrate: async () => {
      const [accessToken, refreshToken] = await Promise.all([SecureStore.getItemAsync(KEY.access), SecureStore.getItemAsync(KEY.refresh)]);
      set({ accessToken, refreshToken, hydrated: true });
    },
    login: async (usernameOrEmail, password) => store(await postAuth('/api/auth/login', { usernameOrEmail, password })),
    register: async (username, email, password) => store(await postAuth('/api/auth/register', { username, email, password })),
    refresh: () => {
      if (inflightRefresh) return inflightRefresh;
      inflightRefresh = (async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) return false;
        try { await store(await postAuth('/api/auth/refresh', { refreshToken })); return true; }
        catch { await get().logout(); return false; }
        finally { inflightRefresh = null; }
      })();
      return inflightRefresh;
    },
    logout: async () => {
      const refreshToken = get().refreshToken;
      if (refreshToken) fetch(BASE_URL + '/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) }).catch(() => {});
      await Promise.all([SecureStore.deleteItemAsync(KEY.access), SecureStore.deleteItemAsync(KEY.refresh)]);
      set({ accessToken: null, refreshToken: null });
    },
  };
});
```

- [ ] **Step 3: API client**

`src/api/client.ts`
```ts
import createClient from 'openapi-fetch';
import { BASE_URL, useAuth } from '@/auth/store';
import type { paths } from './schema';

const authFetch: typeof fetch = async (input, init) => {
  const original = new Request(input, init);
  const send = () => {
    const req = original.clone();
    const token = useAuth.getState().accessToken;
    if (token) req.headers.set('Authorization', `Bearer ${token}`);
    return fetch(req);
  };
  let res = await send();
  if (res.status === 401 && !original.url.includes('/api/auth/') && (await useAuth.getState().refresh())) res = await send();
  return res;
};

export const api = createClient<paths>({ baseUrl: BASE_URL, fetch: authFetch });

type Result<T> = { data?: T; error?: unknown; response: Response };
export async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await p;
  if (response.ok) return data as T;
  const e = error as { message?: string; errors?: { message?: string }[] } | undefined;
  throw new Error(e?.errors?.[0]?.message ?? e?.message ?? `Request failed (${response.status})`);
}
```

- [ ] **Step 4: gate + auth screens**

Replace `app/index.tsx`:
```tsx
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/store';
export default function Index() {
  const token = useAuth((s) => s.accessToken);
  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}
```
In `app/_layout.tsx` add, above the fonts line:
```tsx
const hydrated = useAuth((s) => s.hydrated);
useEffect(() => { void useAuth.getState().hydrate(); }, []);
```
and change the early return to `if (!fontsReady || !hydrated) return <View .../>`. Add a gate component rendered inside the provider:
```tsx
function AuthGate() {
  const token = useAuth((s) => s.accessToken);
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth) router.replace('/(auth)/login');
    if (token && inAuth) router.replace('/(tabs)');
  }, [token, segments]);
  return null;
}
```
(imports: `useEffect` from react, `useRouter, useSegments` from expo-router, `useAuth`.)

`app/(auth)/_layout.tsx`
```tsx
import { Stack } from 'expo-router';
export default function AuthLayout() { return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#121212' } }} />; }
```
`app/(auth)/login.tsx`
```tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { Body, Button, Heading, Meta, Zone } from '@/ui/primitives';
import { color, font } from '@/ui/tokens';

export const field = { height: 52, paddingHorizontal: 16, backgroundColor: color.raised, borderRadius: 12, color: color.t1, fontFamily: font.sans, fontSize: 16 } as const;

export default function Login() {
  const login = useAuth((s) => s.login);
  const [id, setId] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await login(id.trim(), pw); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not sign in'); } finally { setBusy(false); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <Meta tone="ember" style={{ marginBottom: 8 }}>⚡ Volt</Meta>
          <Heading style={{ marginBottom: 24 }}>Sign in.</Heading>
          <TextInput style={field} placeholder="Username or email" placeholderTextColor={color.t3} autoCapitalize="none" autoCorrect={false} value={id} onChangeText={setId} />
          <TextInput style={field} placeholder="Password" placeholderTextColor={color.t3} secureTextEntry value={pw} onChangeText={setPw} onSubmitEditing={submit} />
          {err && <Body tone="ember" size={13}>{err}</Body>}
          <View style={{ height: 8 }} />
          <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy || !id || !pw} />
          <Link href="/(auth)/register" style={{ alignSelf: 'center', marginTop: 16 }}><Body tone="t2">New here? Create an account</Body></Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
```
`app/(auth)/register.tsx` — same layout with three fields (username, email, password) calling `register(username.trim(), email.trim(), pw)`; heading "Create your account."; link back to `/(auth)/login` reading "Have an account? Sign in". Disable the button until username ≥ 3 chars, email contains `@`, password ≥ 8 chars (mirrors `RegisterRequest` limits).

`app/profile.tsx`
```tsx
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { useMe } from '@/api/queries';
import { Body, Button, Heading, Meta, Zone } from '@/ui/primitives';
export default function Profile() {
  const { data: me } = useMe(); const router = useRouter();
  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, padding: 24, gap: 12 }}>
      <Button label="Back" tone="ghost" onPress={() => router.back()} />
      <Heading style={{ marginTop: 24 }}>{me?.displayName ?? me?.username ?? '—'}</Heading>
      <Meta>{me?.username}</Meta>
      <Body tone="t3">Vault, muscle map and ratings arrive with v1.0.</Body>
      <Button label="Log out" tone="ghost" onPress={() => useAuth.getState().logout()} />
    </SafeAreaView></Zone>
  );
}
```
(`useMe` is defined in Task 4; create `src/api/queries.ts` now with only `useMe` and extend it in Task 4:)
```ts
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './client';
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => unwrap(api.GET('/api/users/me')) });
```

- [ ] **Step 5: Verify**

Backend up (`cd backend && ./gradlew bootRun`). `npm run typecheck` clean. In the Simulator: register a user → lands on Today; kill app → relaunch → still on Today (tokens hydrated); Profile → Log out → Login screen. Wrong password → inline message from the backend, no raw JSON.

- [ ] **Step 6: Commit**

```bash
git add mobile/volt-mobile && git commit -m "feat(mobile): generated API types, auth store with refresh, login/register"
```

---

### Task 3: Session reducer, request mapper, PR check, session store (TDD)

**Files:**
- Create: `src/session/reducer.ts`, `src/session/reducer.test.ts`, `src/session/toRequest.ts`, `src/session/toRequest.test.ts`, `src/session/pr.ts`, `src/session/pr.test.ts`, `src/session/store.ts`

**Interfaces:**
- Produces: types `Session`, `SessionExercise`, `ExerciseInput`, `SetValues`, `LoggedSet`, `SetType`; functions `startSession`, `setCurrent`, `step`, `logSet`, `removeLoggedSet`, `goToExercise`, `addExercise`, `prefill`, `clearRest`, `finishSession`, `markSaved`, `loggedCount`, `DEFAULT_REST`; `toRequest(session)`; `isPr(set, records)`, `epley(w, r)`, `prLabel(records)`; store `useSession` with `session`, `start(input)`, `dispatch(fn)`, `discard()`.

- [ ] **Step 1: Failing reducer tests**

`src/session/reducer.test.ts`
```ts
import { addExercise, finishSession, goToExercise, logSet, loggedCount, prefill, startSession, step, ExerciseInput } from './reducer';

const now = '2026-09-21T10:00:00.000Z';
const trap: ExerciseInput = { exerciseId: 'e1', name: 'Trap bar deadlift', muscle: 'HAMSTRINGS', bodyweight: false, restSeconds: 120, planned: [{ weightKg: 147.5, reps: 4 }, { weightKg: 147.5, reps: 4 }, { weightKg: 150, reps: 4 }] };
const pullup: ExerciseInput = { exerciseId: 'e2', name: 'Pull-up', muscle: 'BACK', bodyweight: true, restSeconds: 90, planned: [{ weightKg: null, reps: 8 }] };
const fresh = () => startSession({ id: 's1', title: 'Posterior chain', exercises: [trap, pullup], now });

test('start seeds current from the first planned set', () => {
  expect(fresh().current).toEqual({ weightKg: 147.5, reps: 4 });
  expect(fresh().status).toBe('live');
});

test('step rounds to 2 decimals and never goes below 0', () => {
  expect(step(fresh(), 'weightKg', 2.5).current.weightKg).toBe(150);
  expect(step(step(fresh(), 'reps', -4), 'reps', -1).current.reps).toBe(0);
});

test('logSet appends, arms rest, and advances current to the next planned set', () => {
  const s = logSet(logSet(fresh(), now), '2026-09-21T10:03:00.000Z');
  expect(s.exercises[0].logged).toHaveLength(2);
  expect(s.exercises[0].logged[0]).toMatchObject({ weightKg: 147.5, reps: 4, setType: 'NORMAL', at: now });
  expect(s.current).toEqual({ weightKg: 150, reps: 4 });
  expect(s.restUntil).toBe('2026-09-21T10:05:00.000Z');
});

test('logSet refuses an empty set', () => {
  const s = fresh();
  expect(logSet(step(s, 'reps', -4), now)).toBe(s);
});

test('bodyweight exercise logs with null weight', () => {
  const s = logSet(goToExercise(fresh(), 1), now);
  expect(s.exercises[1].logged[0]).toMatchObject({ weightKg: null, reps: 8 });
});

test('prefill fills null planned weights and current from last session', () => {
  const adhoc = startSession({ id: 's2', title: 'Ad hoc', exercises: [{ ...trap, planned: [{ weightKg: null, reps: 5 }] }], now });
  const s = prefill(adhoc, 'e1', { weightKg: 140, reps: 5 });
  expect(s.exercises[0].planned[0]).toEqual({ weightKg: 140, reps: 5 });
  expect(s.current).toEqual({ weightKg: 140, reps: 5 });
});

test('addExercise to an empty session makes it current', () => {
  const s = addExercise(startSession({ id: 's3', title: 'Empty', exercises: [], now }), trap);
  expect(s.currentExercise).toBe(0);
  expect(s.current).toEqual({ weightKg: 147.5, reps: 4 });
});

test('finishSession marks unsaved and records rpe/note', () => {
  const s = finishSession(logSet(fresh(), now), { rpe: 8, note: 'hard', now: '2026-09-21T11:08:12.000Z' });
  expect(s.status).toBe('unsaved');
  expect(s.finish).toEqual({ rpe: 8, note: 'hard', completedAt: '2026-09-21T11:08:12.000Z' });
  expect(loggedCount(s)).toBe(1);
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- reducer` → FAIL, cannot find module './reducer'.

- [ ] **Step 3: reducer**

`src/session/reducer.ts`
```ts
export type SetType = 'NORMAL' | 'WARMUP' | 'DROP_SET' | 'FAILURE';
export type SetValues = { weightKg: number | null; reps: number | null };
export type LoggedSet = SetValues & { setType: SetType; at: string };
export type SessionExercise = {
  exerciseId: string; name: string; muscle: string; bodyweight: boolean; restSeconds: number;
  planned: SetValues[]; logged: LoggedSet[];
};
export type ExerciseInput = Omit<SessionExercise, 'logged'>;
export type Session = {
  id: string; title: string; routineId?: string; startedAt: string;
  exercises: SessionExercise[]; currentExercise: number; current: SetValues;
  restUntil: string | null; status: 'live' | 'unsaved' | 'saved';
  finish?: { rpe: number; note: string; completedAt: string };
};

export const DEFAULT_REST = 120;
const EMPTY: SetValues = { weightKg: null, reps: null };

function nextCurrent(ex: SessionExercise | undefined): SetValues {
  if (!ex) return EMPTY;
  const last = ex.logged[ex.logged.length - 1];
  const planned = ex.planned[ex.logged.length];
  if (last) return { weightKg: planned?.weightKg ?? last.weightKg, reps: planned?.reps ?? last.reps };
  return planned ? { weightKg: planned.weightKg, reps: planned.reps } : EMPTY;
}

export function startSession(input: { id: string; title: string; routineId?: string; exercises: ExerciseInput[]; now: string }): Session {
  const exercises = input.exercises.map((e) => ({ ...e, logged: [] as LoggedSet[] }));
  return { id: input.id, title: input.title, routineId: input.routineId, startedAt: input.now, exercises, currentExercise: 0, current: nextCurrent(exercises[0]), restUntil: null, status: 'live' };
}

export const setCurrent = (s: Session, patch: Partial<SetValues>): Session => ({ ...s, current: { ...s.current, ...patch } });

export function step(s: Session, field: keyof SetValues, delta: number): Session {
  const next = Math.max(0, Math.round(((s.current[field] ?? 0) + delta) * 100) / 100);
  return setCurrent(s, { [field]: next });
}

export function logSet(s: Session, now: string, setType: SetType = 'NORMAL'): Session {
  const ex = s.exercises[s.currentExercise];
  if (!ex) return s;
  if (!ex.bodyweight && s.current.weightKg == null) return s;
  if (s.current.reps == null || s.current.reps <= 0) return s;
  const updated: SessionExercise = { ...ex, logged: [...ex.logged, { ...s.current, setType, at: now }] };
  const exercises = s.exercises.map((e, i) => (i === s.currentExercise ? updated : e));
  return { ...s, exercises, current: nextCurrent(updated), restUntil: new Date(Date.parse(now) + ex.restSeconds * 1000).toISOString() };
}

export function removeLoggedSet(s: Session, exIdx: number, setIdx: number): Session {
  const exercises = s.exercises.map((e, i) => (i === exIdx ? { ...e, logged: e.logged.filter((_, j) => j !== setIdx) } : e));
  return { ...s, exercises };
}

export function goToExercise(s: Session, index: number): Session {
  if (index < 0 || index >= s.exercises.length) return s;
  return { ...s, currentExercise: index, current: nextCurrent(s.exercises[index]), restUntil: null };
}

export function addExercise(s: Session, ex: ExerciseInput): Session {
  const next = { ...s, exercises: [...s.exercises, { ...ex, logged: [] as LoggedSet[] }] };
  return s.exercises.length === 0 ? goToExercise(next, 0) : next;
}

export function prefill(s: Session, exerciseId: string, last: SetValues): Session {
  const exercises = s.exercises.map((e) => {
    if (e.exerciseId !== exerciseId) return e;
    const planned = e.planned.length ? e.planned : [{ ...EMPTY }];
    return { ...e, planned: planned.map((p) => ({ weightKg: p.weightKg ?? last.weightKg, reps: p.reps ?? last.reps })) };
  });
  const next = { ...s, exercises };
  const cur = next.exercises[next.currentExercise];
  return cur?.exerciseId === exerciseId && cur.logged.length === 0 ? { ...next, current: nextCurrent(cur) } : next;
}

export const clearRest = (s: Session): Session => ({ ...s, restUntil: null });

export const finishSession = (s: Session, f: { rpe: number; note: string; now: string }): Session =>
  ({ ...s, status: 'unsaved', restUntil: null, finish: { rpe: f.rpe, note: f.note, completedAt: f.now } });

export const markSaved = (s: Session): Session => ({ ...s, status: 'saved' });
export const loggedCount = (s: Session) => s.exercises.reduce((n, e) => n + e.logged.length, 0);
```

- [ ] **Step 4: Run reducer tests**

Run: `npm test -- reducer` → 8 passed.

- [ ] **Step 5: Failing mapper + PR tests**

`src/session/toRequest.test.ts`
```ts
import { finishSession, logSet, startSession } from './reducer';
import { toRequest } from './toRequest';

const now = '2026-09-21T10:00:00.000Z';
const base = startSession({ id: 's', title: 'Posterior chain', exercises: [
  { exerciseId: 'e1', name: 'Trap bar', muscle: 'HAMSTRINGS', bodyweight: false, restSeconds: 120, planned: [{ weightKg: 147.5, reps: 4 }] },
  { exerciseId: 'e2', name: 'Skipped', muscle: 'CORE', bodyweight: false, restSeconds: 60, planned: [] },
], now });

test('maps only exercises with logged sets, prefixes RPE into notes', () => {
  const s = finishSession(logSet(base, now), { rpe: 8, note: 'hard', now: '2026-09-21T11:00:00.000Z' });
  expect(toRequest(s)).toEqual({
    title: 'Posterior chain', notes: 'RPE 8 · hard', startedAt: now, completedAt: '2026-09-21T11:00:00.000Z',
    exercises: [{ exerciseId: 'e1', restSeconds: 120, sets: [{ setType: 'NORMAL', reps: 4, weightKg: 147.5, completedAt: now }] }],
  });
});

test('empty note yields just the RPE', () => {
  const s = finishSession(logSet(base, now), { rpe: 7, note: '  ', now });
  expect(toRequest(s).notes).toBe('RPE 7');
});

test('throws when not finished', () => {
  expect(() => toRequest(base)).toThrow('not finished');
});
```
`src/session/pr.test.ts`
```ts
import { epley, isPr, prLabel } from './pr';
const records = [{ type: 'MAX_WEIGHT', value: 140 }, { type: 'ONE_REP_MAX', value: 160 }] as any;
test('epley', () => expect(epley(100, 3)).toBeCloseTo(110));
test('heavier than max weight is a PR', () => expect(isPr({ weightKg: 142.5, reps: 1 }, records)).toBe(true));
test('higher e1RM is a PR', () => expect(isPr({ weightKg: 140, reps: 6 }, records)).toBe(true));
test('neither is not', () => expect(isPr({ weightKg: 120, reps: 4 }, records)).toBe(false));
test('no records means first set is not flagged', () => expect(isPr({ weightKg: 100, reps: 5 }, [])).toBe(false));
test('label', () => expect(prLabel(records)).toBe('PR 140 KG'));
```

- [ ] **Step 6: Run, expect failure** — `npm test` → both new files fail on missing modules.

- [ ] **Step 7: mapper + PR**

`src/session/toRequest.ts`
```ts
import type { components } from '@/api/schema';
import type { Session } from './reducer';

export type CreateWorkoutRequest = components['schemas']['CreateWorkoutRequest'];

export function toRequest(s: Session): CreateWorkoutRequest {
  if (!s.finish) throw new Error('session not finished');
  const notes = [`RPE ${s.finish.rpe}`, s.finish.note.trim()].filter(Boolean).join(' · ');
  return {
    title: s.title, notes, startedAt: s.startedAt, completedAt: s.finish.completedAt,
    exercises: s.exercises.filter((e) => e.logged.length > 0).map((e) => ({
      exerciseId: e.exerciseId, restSeconds: e.restSeconds,
      sets: e.logged.map((l) => ({ setType: l.setType, reps: l.reps ?? undefined, weightKg: l.weightKg ?? undefined, completedAt: l.at })),
    })),
  };
}
```
`src/session/pr.ts`
```ts
import type { components } from '@/api/schema';
import type { SetValues } from './reducer';
type Rec = components['schemas']['PersonalRecordResponse'];

export const epley = (w: number, r: number) => w * (1 + r / 30);

export function isPr(set: SetValues, records: Rec[]): boolean {
  if (records.length === 0 || set.weightKg == null || set.reps == null || set.reps <= 0) return false;
  const best = (t: Rec['type']) => records.find((r) => r.type === t)?.value ?? 0;
  return set.weightKg > best('MAX_WEIGHT') || (set.reps <= 10 && epley(set.weightKg, set.reps) > best('ONE_REP_MAX'));
}

export function prLabel(records: Rec[]): string | null {
  const w = records.find((r) => r.type === 'MAX_WEIGHT')?.value;
  return w ? `PR ${w} KG` : null;
}
```
Note: `no records → false` because the first-ever set of an exercise is not a milestone worth a takeover.

- [ ] **Step 8: Run all tests** — `npm test` → all green. `npm run typecheck` clean.

- [ ] **Step 9: store**

`src/session/store.ts`
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as R from './reducer';

type State = {
  session: R.Session | null;
  start: (input: Parameters<typeof R.startSession>[0]) => void;
  dispatch: (fn: (s: R.Session) => R.Session) => void;
  discard: () => void;
};

export const useSession = create<State>()(
  persist(
    (set, get) => ({
      session: null,
      start: (input) => set({ session: R.startSession(input) }),
      dispatch: (fn) => { const s = get().session; if (s) set({ session: fn(s) }); },
      discard: () => set({ session: null }),
    }),
    { name: 'volt.session', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ session: s.session }) },
  ),
);

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
```

- [ ] **Step 10: Commit**

```bash
git add mobile/volt-mobile/src/session && git commit -m "feat(mobile): session reducer, request mapper, PR check with tests"
```

---

### Task 4: Queries, tab shell, Today, placeholders, session pill

**Files:**
- Modify: `src/api/queries.ts`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`
- Create: `app/(tabs)/plan.tsx`, `app/(tabs)/feed.tsx`, `app/(tabs)/rivals.tsx`, `src/ui/SessionPill.tsx`, `src/session/fromRoutine.ts`

**Interfaces:**
- Consumes: `api`, `unwrap`, `useSession`, reducer types.
- Produces: `useExercises(q)`, `useRoutines()`, `useDashboard()`, `useLastSets(ids)`, `useRecords(id)`, `useWorkout(id)`, `useSaveWorkout()`; `fromRoutine(routine, exercisesById)` → `ExerciseInput[]`; `formatElapsed(ms)`.

- [ ] **Step 1: queries**

`src/api/queries.ts` (replace the Task 2 file)
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { components } from './schema';

export type S = components['schemas'];

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => unwrap(api.GET('/api/users/me')) });
export const useExercises = (q = '') => useQuery({ queryKey: ['exercises', q], queryFn: () => unwrap(api.GET('/api/exercises', { params: { query: q ? { q } : {} } })) });
export const useRoutines = () => useQuery({ queryKey: ['routines'], queryFn: () => unwrap(api.GET('/api/routines')) });
export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => unwrap(api.GET('/api/dashboard')) });
export const useLastSets = (exerciseIds: string[]) => useQuery({
  queryKey: ['last-sets', exerciseIds], enabled: exerciseIds.length > 0,
  queryFn: () => unwrap(api.GET('/api/workouts/last-sets', { params: { query: { exerciseIds } } })),
});
export const useRecords = (id?: string) => useQuery({
  queryKey: ['records', id], enabled: !!id,
  queryFn: () => unwrap(api.GET('/api/exercises/{id}/records', { params: { path: { id: id! } } })),
});
export const useWorkout = (id?: string) => useQuery({
  queryKey: ['workout', id], enabled: !!id,
  queryFn: () => unwrap(api.GET('/api/workouts/{id}', { params: { path: { id: id! } } })),
});
export function useSaveWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: S['CreateWorkoutRequest']) => unwrap(api.POST('/api/workouts', { body })),
    onSuccess: (w) => {
      qc.setQueryData(['workout', w.id], w);
      for (const k of ['dashboard', 'last-sets', 'records']) void qc.invalidateQueries({ queryKey: [k] });
    },
  });
}
```

- [ ] **Step 2: fromRoutine + elapsed helper**

`src/session/fromRoutine.ts`
```ts
import type { S } from '@/api/queries';
import { DEFAULT_REST, ExerciseInput } from './reducer';

export function fromRoutine(r: S['RoutineResponse'], byId: Map<string, S['ExerciseResponse']>): ExerciseInput[] {
  return (r.exercises ?? []).map((re) => {
    const ex = byId.get(re.exerciseId ?? '');
    const sets = Math.max(1, re.targetSets ?? 3);
    return {
      exerciseId: re.exerciseId ?? '', name: re.exerciseName ?? ex?.name ?? 'Exercise',
      muscle: ex?.primaryMuscleGroup ?? 'FULL_BODY', bodyweight: ex?.equipment === 'BODYWEIGHT',
      restSeconds: re.restSeconds ?? DEFAULT_REST,
      planned: Array.from({ length: sets }, () => ({ weightKg: null, reps: re.targetReps ?? null })),
    };
  });
}

export function toInput(ex: S['ExerciseResponse']): ExerciseInput {
  return { exerciseId: ex.id ?? '', name: ex.name ?? 'Exercise', muscle: ex.primaryMuscleGroup ?? 'FULL_BODY', bodyweight: ex.equipment === 'BODYWEIGHT', restSeconds: DEFAULT_REST, planned: [] };
}

export const formatElapsed = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};
export const humanMuscle = (m: string) => m.toLowerCase().replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
```

- [ ] **Step 3: tab shell + placeholders + pill**

`app/(tabs)/_layout.tsx`
```tsx
import { Tabs } from 'expo-router';
import { SessionPill } from '@/ui/SessionPill';
import { color, font } from '@/ui/tokens';
export default function TabsLayout() {
  return (
    <>
      <Tabs screenOptions={{
        headerShown: false, tabBarShowLabel: true, tabBarIconStyle: { display: 'none' },
        tabBarStyle: { backgroundColor: color.sunken, borderTopWidth: 0, height: 84, paddingTop: 12 },
        tabBarLabelStyle: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
        tabBarActiveTintColor: color.t1, tabBarInactiveTintColor: color.t3, sceneStyle: { backgroundColor: color.base },
      }}>
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
        <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
        <Tabs.Screen name="rivals" options={{ title: 'Rivals' }} />
      </Tabs>
      <SessionPill />
    </>
  );
}
```
Placeholders (`plan.tsx`, `feed.tsx`, `rivals.tsx`) — same shape, different copy:
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Heading, Zone } from '@/ui/primitives';
export default function Plan() {
  return <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, padding: 24 }}><Heading>Plan</Heading><Body tone="t3" style={{ marginTop: 8 }}>Your week, seeded from your goal. Arrives with v1.0.</Body></SafeAreaView></Zone>;
}
```
Feed copy: "Following, kudos, trained-together. Arrives with v1.1." Rivals: "Your weekly rival and the load board. Arrives with v1.1."

`src/ui/SessionPill.tsx` — shown over the tab bar while a session is live and the live screen is not open:
```tsx
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatElapsed } from '@/session/fromRoutine';
import { loggedCount } from '@/session/reducer';
import { useSession } from '@/session/store';
import { Meta, Mono } from './primitives';
import { color } from './tokens';

export function SessionPill() {
  const session = useSession((s) => s.session);
  const router = useRouter(); const path = usePathname(); const insets = useSafeAreaInsets();
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  if (!session || session.status !== 'live' || path.startsWith('/workout')) return null;
  return (
    <Pressable onPress={() => router.push('/workout/live')} style={{ position: 'absolute', left: 16, right: 16, bottom: 84 + insets.bottom + 8, height: 48, borderRadius: 24, backgroundColor: color.raised, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.ember }} />
      <Mono tone="ember" size={13}>{formatElapsed(Date.now() - Date.parse(session.startedAt))}</Mono>
      <Meta tone="t2" style={{ flex: 1 }} numberOfLines={1}>{session.title}</Meta>
      <Meta>{loggedCount(session)} sets</Meta>
    </Pressable>
  );
}
```

- [ ] **Step 4: Today**

`app/(tabs)/index.tsx`
```tsx
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboard, useExercises, useMe, useRoutines } from '@/api/queries';
import { fromRoutine } from '@/session/fromRoutine';
import { newId, useSession } from '@/session/store';
import { Body, Button, HeaderWash, Heading, Hairline, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Today() {
  const router = useRouter();
  const { data: me } = useMe(); const { data: dash } = useDashboard();
  const { data: routines } = useRoutines(); const { data: exercises } = useExercises();
  const session = useSession((s) => s.session); const start = useSession((s) => s.start); const discard = useSession((s) => s.discard);
  const routine = routines?.[0];
  const byId = new Map((exercises ?? []).map((e) => [e.id ?? '', e]));
  const initials = (me?.displayName ?? me?.username ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const volume = dash?.week?.volumeKg;

  const begin = (adhoc: boolean) => {
    if (session?.status === 'live') return router.push('/workout/live');
    start({ id: newId(), title: adhoc || !routine ? 'Ad-hoc session' : routine.name ?? 'Session', routineId: adhoc ? undefined : routine?.id, exercises: adhoc || !routine ? [] : fromRoutine(routine, byId), now: new Date().toISOString() });
    router.push('/workout/live');
  };

  return (
    <Zone style={{ flex: 1 }}>
      <HeaderWash tone="ember" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Meta tone="ember">⚡ Volt</Meta>
            <Pressable onPress={() => router.push('/profile')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}><Mono size={12}>{initials}</Mono></Pressable>
          </View>
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <Heading>{DAY[new Date().getDay()]}.</Heading>
            <Heading tone="t2">{routine?.name ? `${routine.name}.` : 'No plan today.'}</Heading>
          </View>
          <View style={{ paddingHorizontal: 24, paddingTop: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
              <Numeral>{volume == null ? '—' : Math.round(volume).toLocaleString()}</Numeral>
            </View>
            <Body tone="t2" style={{ marginTop: 4 }}>Volume, last seven days · kg</Body>
          </View>
          <View style={{ height: 32 }} />
          <Hairline />
          <Zone level="raised" style={{ padding: 24, gap: 6 }}>
            <Meta tone="ember">● Session 1{routine?.exercises?.length ? ` · ${routine.exercises.length} lifts` : ''}</Meta>
            <Heading size={24} style={{ marginTop: 6 }}>{routine?.name ?? 'Ad-hoc session'}</Heading>
            {(routine?.exercises ?? []).slice(0, 3).map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{e.exerciseName}</Body>
                <Mono tone="t2" size={13}>{e.targetSets ?? '–'}×{e.targetReps ?? '–'}</Mono>
              </View>
            ))}
            {(routine?.exercises?.length ?? 0) > 3 && <Body tone="t3" size={13}>+ {routine!.exercises!.length - 3} more</Body>}
            {!routine && <Body tone="t3" size={13}>No routines yet. Start logs an empty session; long-press always does.</Body>}
            {session?.status === 'unsaved' && (
              <Pressable onPress={() => router.push('/workout/finish')} style={{ marginTop: 8, borderLeftWidth: 2, borderLeftColor: color.ember, paddingLeft: 12 }}>
                <Body tone="t2" size={13}>Unsaved session — tap to retry</Body>
              </Pressable>
            )}
            <View style={{ height: 16 }} />
            <Button label={session?.status === 'live' ? 'Resume session' : 'Start session'} onPress={() => begin(false)} onLongPress={() => begin(true)} delayLongPress={400} />
            {session?.status === 'saved' && <Pressable onPress={discard}><Body tone="t3" size={12} style={{ textAlign: 'center', marginTop: 12 }}>Clear last session</Body></Pressable>}
          </Zone>
        </ScrollView>
      </SafeAreaView>
    </Zone>
  );
}
```

- [ ] **Step 5: Verify**

`npm run typecheck` clean. Simulator: Today shows weekday heading, `—` or the real week volume, first routine (create one via Swagger at `/swagger-ui` if none), four mono tab labels on a `#0D0D0D` bar, ember wash at the top. Long-press Start → pushes `/workout/live` (blank until Task 5). Back out → pill shows over the tab bar with a ticking timer.

- [ ] **Step 6: Commit**

```bash
git add mobile/volt-mobile && git commit -m "feat(mobile): tab shell, Today screen, queries, session pill"
```

---

### Task 5: Live Lift + exercise picker

**Files:**
- Create: `app/workout/live.tsx`, `app/workout/picker.tsx`, `src/ui/useNow.ts`

**Interfaces:**
- Consumes: `useSession`, reducer functions, `useLastSets`, `useRecords`, `useExercises`, `toInput`, `isPr`, `prLabel`, `formatElapsed`, primitives.

- [ ] **Step 1: ticking clock hook**

`src/ui/useNow.ts`
```ts
import { useEffect, useState } from 'react';
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(id); }, [intervalMs]);
  return now;
}
```

- [ ] **Step 2: picker**

`app/workout/picker.tsx`
```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExercises } from '@/api/queries';
import { fromRoutine, humanMuscle, toInput } from '@/session/fromRoutine';
import { addExercise } from '@/session/reducer';
import { useSession } from '@/session/store';
import { Body, Hairline, Heading, Meta, Zone } from '@/ui/primitives';
import { color, font } from '@/ui/tokens';

export default function Picker() {
  const router = useRouter(); const [q, setQ] = useState('');
  const { data } = useExercises();
  const dispatch = useSession((s) => s.dispatch);
  const list = (data ?? []).filter((e) => (e.name ?? '').toLowerCase().includes(q.toLowerCase()));
  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Heading size={24}>Add exercise</Heading>
          <Pressable onPress={() => router.back()} hitSlop={12}><Meta tone="t2">Close</Meta></Pressable>
        </View>
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search exercises" placeholderTextColor={color.t3} autoCorrect={false}
          style={{ height: 48, borderRadius: 12, paddingHorizontal: 16, backgroundColor: color.raised, color: color.t1, fontFamily: font.sans, fontSize: 16 }} />
      </View>
      <FlatList data={list} keyExtractor={(e) => e.id ?? e.name ?? ''} ItemSeparatorComponent={Hairline} keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={() => { dispatch((s) => addExercise(s, toInput(item))); router.back(); }} style={{ paddingHorizontal: 24, paddingVertical: 14, gap: 2 }}>
            <Body>{item.name}</Body>
            <Meta>{humanMuscle(item.primaryMuscleGroup ?? '')} · {(item.equipment ?? '').toLowerCase()}</Meta>
          </Pressable>
        )}
        ListEmptyComponent={<Body tone="t3" style={{ padding: 24 }}>Nothing matches.</Body>} />
    </SafeAreaView></Zone>
  );
}
```
(`fromRoutine` import is unused here — omit it.)

- [ ] **Step 3: Live Lift**

`app/workout/live.tsx`
```tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLastSets, useRecords } from '@/api/queries';
import { formatElapsed } from '@/session/fromRoutine';
import { isPr, prLabel } from '@/session/pr';
import { clearRest, goToExercise, logSet, prefill, removeLoggedSet, step } from '@/session/reducer';
import { useSession } from '@/session/store';
import { Body, Button, Hairline, Heading, Meta, Mono, Numeral, Stepper, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';
import { useNow } from '@/ui/useNow';

export default function Live() {
  const router = useRouter(); const now = useNow();
  const session = useSession((s) => s.session); const dispatch = useSession((s) => s.dispatch); const discard = useSession((s) => s.discard);
  const [expanded, setExpanded] = useState(false);
  const ex = session?.exercises[session.currentExercise];
  const ids = session?.exercises.map((e) => e.exerciseId) ?? [];
  const { data: lastSets } = useLastSets(ids);
  const { data: records } = useRecords(ex?.exerciseId);

  useEffect(() => {
    if (!lastSets) return;
    for (const l of lastSets) if (l.exerciseId) dispatch((s) => prefill(s, l.exerciseId!, { weightKg: l.weightKg ?? null, reps: l.reps ?? null }));
  }, [lastSets]);

  if (!session || session.status !== 'live') { router.back(); return null; }

  const restLeft = session.restUntil ? Date.parse(session.restUntil) - now : 0;
  const canLog = (ex?.bodyweight || session.current.weightKg != null) && (session.current.reps ?? 0) > 0;
  const nextEx = session.exercises[session.currentExercise + 1];
  const avgRpe = null; // per-set RPE not captured in this slice
  const willPr = ex && records?.records && isPr(session.current, records.records);

  const onLog = () => dispatch((s) => logSet(s, new Date().toISOString()));
  const onClose = () => Alert.alert('Leave session?', 'Your sets stay saved on this phone.', [
    { text: 'Minimise', onPress: () => router.back() },
    { text: 'Discard session', style: 'destructive', onPress: () => { discard(); router.back(); } },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Mono tone="ember" size={13}>● {formatElapsed(now - Date.parse(session.startedAt))}</Mono>
        <Pressable onPress={onClose} hitSlop={12}><Meta tone="t2">×</Meta></Pressable>
      </View>
      <View style={{ paddingHorizontal: 24, paddingTop: 12, gap: 4 }}>
        <Body tone="t2">{session.title}</Body>
        <Meta>Exercise {session.currentExercise + 1} / {session.exercises.length || 1}</Meta>
      </View>
      <View style={{ height: 2, backgroundColor: color.ember, marginTop: 16, width: `${(100 * (session.currentExercise + 1)) / Math.max(1, session.exercises.length)}%` }} />

      {!ex ? (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
          <Heading>Empty session.</Heading>
          <Body tone="t2">Add your first exercise to start logging.</Body>
          <Button label="Add exercise" onPress={() => router.push('/workout/picker')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 6 }}>
            <Pressable onPress={() => router.push('/workout/picker')} onLongPress={() => {}}><Heading size={26}>{ex.name}</Heading></Pressable>
            <Meta>Set {ex.logged.length + 1} of {Math.max(ex.planned.length, ex.logged.length + 1)}{records?.records && prLabel(records.records) ? ` · ${prLabel(records.records)}` : ''}</Meta>
          </View>
          <View style={{ paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
            {!ex.bodyweight && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Numeral size={88}>{session.current.weightKg == null ? '—' : String(session.current.weightKg).replace(/\.5$/, '')}</Numeral>
                {String(session.current.weightKg ?? '').endsWith('.5') && <Numeral size={40} tone="t2" style={{ marginBottom: 8 }}>.5</Numeral>}
                <Meta tone="t2" style={{ marginBottom: 14, marginLeft: 6 }}>kg</Meta>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginLeft: 'auto' }}>
              <Numeral size={44}>{session.current.reps ?? '—'}</Numeral>
              <Meta tone="t2" style={{ marginBottom: 10, marginLeft: 6 }}>reps</Meta>
            </View>
          </View>
          {willPr && <Meta tone="gold" style={{ paddingHorizontal: 24, paddingTop: 8 }}>New record if you log this</Meta>}
          <View style={{ paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row', gap: 12 }}>
            {!ex.bodyweight && <Stepper label="2.5 kg" onMinus={() => dispatch((s) => step(s, 'weightKg', -2.5))} onPlus={() => dispatch((s) => step(s, 'weightKg', 2.5))} />}
            <Stepper label="rep" onMinus={() => dispatch((s) => step(s, 'reps', -1))} onPlus={() => dispatch((s) => step(s, 'reps', 1))} />
          </View>

          <Zone level="raised" style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 16 }}>
            <Pressable onPress={() => setExpanded((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Body tone="t2" size={13}>{ex.logged.length} set{ex.logged.length === 1 ? '' : 's'} logged</Body>
              <Meta>{expanded ? 'Hide' : 'Show'}</Meta>
            </Pressable>
            {expanded && ex.logged.map((l, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 }}>
                <Mono tone="t2" size={13}>{String(i + 1).padStart(2, '0')}  {l.weightKg ?? 'BW'} × {l.reps}</Mono>
                <Pressable onPress={() => dispatch((s) => removeLoggedSet(s, s.currentExercise, i))} hitSlop={8}><Meta>Remove</Meta></Pressable>
              </View>
            ))}
            <View style={{ height: 12 }} /><Hairline />
            {ex.planned.slice(ex.logged.length).map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }}>
                <Mono tone={i === 0 ? 't1' : 't3'} size={13}>{String(ex.logged.length + i + 1).padStart(2, '0')}  {p.weightKg ?? (ex.bodyweight ? 'BW' : '—')} × {p.reps ?? '—'}</Mono>
                <Meta tone={i === 0 ? 'ember' : 't3'}>{i === 0 ? 'Now' : '—'}</Meta>
              </View>
            ))}
            <Pressable onPress={() => nextEx ? dispatch((s) => goToExercise(s, s.currentExercise + 1)) : router.push('/workout/picker')} style={{ marginTop: 16, borderLeftWidth: 2, borderLeftColor: color.jade, paddingLeft: 12 }}>
              <Body tone="t2" size={13}>{nextEx ? `Next up — ${nextEx.name}` : 'Add another exercise'}</Body>
            </Pressable>
            {session.currentExercise > 0 && <Pressable onPress={() => dispatch((s) => goToExercise(s, s.currentExercise - 1))} style={{ marginTop: 10 }}><Meta>← Previous exercise</Meta></Pressable>}
          </Zone>
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: 24, paddingBottom: 8, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Meta>Rest</Meta>
          <Pressable onPress={() => dispatch(clearRest)} hitSlop={8}><Mono tone={restLeft > 0 ? 't1' : 't3'} size={13}>{restLeft > 0 ? formatElapsed(restLeft) : '—'}</Mono></Pressable>
        </View>
        {ex && <Button label="Log set" onPress={onLog} disabled={!canLog} />}
        <Pressable onPress={() => router.push('/workout/finish')} style={{ alignSelf: 'center', paddingVertical: 8 }}><Meta tone="t2">Finish session</Meta></Pressable>
        <Meta style={{ textAlign: 'center' }}>Swipe down to minimise</Meta>
      </View>
    </SafeAreaView></Zone>
  );
}
```
Drop the unused `avgRpe` line before committing.

- [ ] **Step 4: Verify**

Simulator, backend running: Start session from a routine → first exercise with prefilled reps; after the last-sets query lands, weight fills from history (log one workout via Swagger first to have history). Log set → row appears in the folded list, rest counts down from the routine's `restSeconds` (or 2:00), current advances to the next planned set. Steppers move by 2.5 / 1 and never below 0. Swipe the modal down → pill on Today with the same timer → tap → back on the same exercise. Kill the app → relaunch → pill still there. Empty session → Add exercise → picker filters → adds and returns.

- [ ] **Step 5: Commit**

```bash
git add mobile/volt-mobile && git commit -m "feat(mobile): Live Lift screen with steppers, rest timer, prefill and exercise picker"
```

---

### Task 6: Finish → Save → Summary

**Files:**
- Create: `app/workout/finish.tsx`, `app/workout/summary.tsx`

**Interfaces:**
- Consumes: `useSession`, `finishSession`, `markSaved`, `loggedCount`, `toRequest`, `useSaveWorkout`, `useWorkout`, `humanMuscle`, `formatElapsed`.

- [ ] **Step 1: Finish**

`app/workout/finish.tsx`
```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSaveWorkout } from '@/api/queries';
import { formatElapsed } from '@/session/fromRoutine';
import { finishSession, loggedCount, markSaved } from '@/session/reducer';
import { useSession } from '@/session/store';
import { toRequest } from '@/session/toRequest';
import { Body, Button, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color, font } from '@/ui/tokens';

const RPE_WORDS: Record<number, string> = { 4: 'Easy — warm-up effort', 5: 'Comfortable', 6: 'Moderate — plenty left', 7: 'Hard but controlled', 8: 'Hard — could have held one more set', 9: 'Very hard — nothing spare', 10: 'Maximal' };

export default function Finish() {
  const router = useRouter();
  const session = useSession((s) => s.session); const dispatch = useSession((s) => s.dispatch); const discard = useSession((s) => s.discard);
  const save = useSaveWorkout();
  const [rpe, setRpe] = useState(session?.finish?.rpe ?? 8); const [note, setNote] = useState(session?.finish?.note ?? '');
  if (!session) { router.replace('/(tabs)'); return null; }
  const stoppedAt = session.finish?.completedAt ?? new Date().toISOString();
  const sets = loggedCount(session);

  const onSave = async () => {
    const finished = session.finish ? { ...session, finish: { ...session.finish, rpe, note } } : finishSession(session, { rpe, note, now: stoppedAt });
    dispatch(() => finished);
    try {
      const w = await save.mutateAsync(toRequest(finished));
      dispatch(markSaved);
      router.replace({ pathname: '/workout/summary', params: { id: w.id ?? '' } });
    } catch (e) {
      Alert.alert("Couldn't save yet", `${e instanceof Error ? e.message : 'No connection'}. Your session is kept on this phone — retry from Today.`);
      router.replace('/(tabs)');
    }
  };
  const onDiscard = () => Alert.alert('Discard session?', 'This cannot be undone.', [{ text: 'Keep', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => { discard(); router.replace('/(tabs)'); } }]);

  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, padding: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Meta tone="t2">● Stopped</Meta><Meta>{sets} sets</Meta></View>
      <Meta style={{ marginTop: 40 }}>Session ended</Meta>
      <Numeral size={72} style={{ marginTop: 8 }}>{formatElapsed(Date.parse(stoppedAt) - Date.parse(session.startedAt))}</Numeral>
      <Body tone="t2" size={17}>{session.title}</Body>
      <Heading size={20} style={{ marginTop: 40 }}>How hard did that feel?</Heading>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
        {[4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Pressable key={n} onPress={() => setRpe(n)} style={{ flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: n === rpe ? color.t1 : color.raised }}>
            <Mono tone={n === rpe ? 't3' : 't2'} style={n === rpe ? { color: color.sunken } : undefined}>{n}</Mono>
          </Pressable>
        ))}
      </View>
      <Body tone="t3" size={13} style={{ marginTop: 10 }}>{RPE_WORDS[rpe]}</Body>
      <View style={{ flex: 1 }} />
      <TextInput value={note} onChangeText={setNote} placeholder="Add a note for this session" placeholderTextColor={color.t3} multiline
        style={{ minHeight: 52, borderRadius: 12, padding: 16, backgroundColor: color.raised, color: color.t1, fontFamily: font.sans, fontSize: 15, marginBottom: 16 }} />
      <Button label={save.isPending ? 'Saving…' : 'Save session'} onPress={onSave} disabled={save.isPending || sets === 0} />
      {sets === 0 && <Body tone="t3" size={12} style={{ textAlign: 'center', marginTop: 8 }}>Log at least one set to save.</Body>}
      <Pressable onPress={onDiscard} style={{ alignSelf: 'center', paddingVertical: 14 }}><Body tone="t2">Discard</Body></Pressable>
    </SafeAreaView></Zone>
  );
}
```

- [ ] **Step 2: Summary**

`app/workout/summary.tsx`
```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkout } from '@/api/queries';
import { formatElapsed, humanMuscle } from '@/session/fromRoutine';
import { useSession } from '@/session/store';
import { Body, Button, HeaderWash, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function Summary() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>();
  const { data: w } = useWorkout(id);
  const session = useSession((s) => s.session); const discard = useSession((s) => s.discard);
  const muscles = new Map<string, number>();
  for (const e of session?.exercises ?? []) if (e.logged.length) muscles.set(e.muscle, (muscles.get(e.muscle) ?? 0) + e.logged.length);
  const prs = (w?.exercises ?? []).flatMap((e) => (e.sets ?? []).filter((s) => s.isPr).map((s) => ({ name: e.exerciseName, w: s.weightKg, r: s.reps })));
  const started = w?.startedAt ?? session?.startedAt; const ended = w?.completedAt ?? session?.finish?.completedAt;
  const date = started ? new Date(started).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const done = () => { discard(); router.replace('/(tabs)'); };

  return (
    <Zone style={{ flex: 1 }}>
      <HeaderWash tone="ember" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <Heading size={26}>{w?.title ?? session?.title}</Heading>
          <Meta style={{ marginTop: 6 }}>{date}{ended && started ? ` · ${formatElapsed(Date.parse(ended) - Date.parse(started))}` : ''}</Meta>
          <Numeral style={{ marginTop: 40 }}>{w?.totalVolumeKg == null ? '—' : Math.round(w.totalVolumeKg).toLocaleString()}</Numeral>
          <Body tone="t2">Total volume · kg</Body>
          <View style={{ height: 32 }} /><Hairline />
          <View style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between' }}><Body tone="t2">Sets</Body><Mono>{session?.exercises.reduce((n, e) => n + e.logged.length, 0) ?? 0}</Mono></View>
          <Hairline />
          <Meta style={{ marginTop: 24 }}>Muscles worked · sets</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {[...muscles.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => (
              <View key={m} style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: color.raised, alignItems: 'center' }}>
                <Body size={13}>{humanMuscle(m)}</Body><Mono tone="t3" size={12}>{n}</Mono>
              </View>
            ))}
          </View>
          {prs.length > 0 && (<>
            <Meta style={{ marginTop: 28 }}>Records</Meta>
            {prs.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }}>
                <Body tone="gold">★ {p.name}</Body><Mono tone="t2" size={13}>{p.w ?? 'BW'} × {p.r}</Mono>
              </View>
            ))}
          </>)}
          <Body tone="t3" size={13} style={{ marginTop: 28 }}>Load earned and rating changes arrive with v1.0.</Body>
        </ScrollView>
        <View style={{ padding: 24 }}><Button label="Done" onPress={done} /></View>
      </SafeAreaView>
    </Zone>
  );
}
```

- [ ] **Step 3: Verify**

Simulator: Finish shows stopped timer and RPE row, 8 preselected, Save disabled with zero sets. Save with backend up → Summary with real total volume, muscle chips, PR rows when the backend flags one (log a heavier set than any earlier workout). Done → Today, pill gone. Stop the backend → Save → alert, back on Today with the "Unsaved session — tap to retry" row → start backend → tap → Finish → Save → Summary.

- [ ] **Step 4: Commit**

```bash
git add mobile/volt-mobile && git commit -m "feat(mobile): finish, save with offline retry, and summary screens"
```

---

### Task 7: Docs, lint pass, PR

**Files:**
- Modify: `mobile/CLAUDE.md` (stack decided, commands, folder map, backend follow-ups), `AGENTS.md` (mobile line: "scaffolded — see mobile/CLAUDE.md")

- [ ] **Step 1: Update `mobile/CLAUDE.md`** — replace "Not yet scaffolded" with the real stack list from the spec §3, the three npm scripts, the folder map, the offline model in three sentences, and the backend follow-ups list from spec §7.

- [ ] **Step 2: Full check** — `npm run typecheck && npm test`; run every flow once more in the Simulator; screenshot Today, Live Lift, Finish, Summary and compare against artboards 01/02/10/11.

- [ ] **Step 3: Commit + PR**

```bash
git add mobile/CLAUDE.md AGENTS.md && git commit -m "docs(mobile): record the scaffolded stack and backend follow-ups"
git push -u origin feat/mobile-log-loop
gh pr create --title "feat(mobile): foundation + Log loop (slice 1)" --body-file <(printf '%s\n' "Implements docs/superpowers/specs/2026-09-02-mobile-log-loop-design.md" "" "🤖 Generated with [Claude Code](https://claude.com/claude-code)")
```
