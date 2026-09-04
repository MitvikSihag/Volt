import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
const KEY = { access: 'volt.access', refresh: 'volt.refresh' };

// ponytail: SecureStore has no web implementation; web is a dev-preview target only, so fall back to AsyncStorage there.
const secure = Platform.OS === 'web'
  ? { getItemAsync: AsyncStorage.getItem, setItemAsync: AsyncStorage.setItem, deleteItemAsync: AsyncStorage.removeItem }
  : SecureStore;

type Tokens = { accessToken: string; refreshToken: string };
type AuthState = {
  accessToken: string | null; refreshToken: string | null; hydrated: boolean; next: string | null;
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
    await Promise.all([secure.setItemAsync(KEY.access, t.accessToken), secure.setItemAsync(KEY.refresh, t.refreshToken)]);
    set({ accessToken: t.accessToken, refreshToken: t.refreshToken });
  };
  return {
    accessToken: null, refreshToken: null, hydrated: false, next: null,
    hydrate: async () => {
      const [accessToken, refreshToken] = await Promise.all([secure.getItemAsync(KEY.access), secure.getItemAsync(KEY.refresh)]);
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
      await Promise.all([secure.deleteItemAsync(KEY.access), secure.deleteItemAsync(KEY.refresh)]);
      set({ accessToken: null, refreshToken: null });
    },
  };
});
