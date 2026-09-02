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
