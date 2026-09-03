import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Goal } from './templates';

type Onboarding = {
  goal: Goal | null; eventName: string | null; eventDate: string | null; startedAt: string | null; openedAt: string | null; firstSetAt: string | null; done: boolean;
  choose: (goal: Goal, eventName: string | null, weeksOut: number | null) => void;
  markOpened: () => void; markFirstSet: () => void; finish: () => void;
};

export const useOnboarding = create<Onboarding>()(
  persist(
    (set, get) => ({
      goal: null, eventName: null, eventDate: null, startedAt: null, openedAt: null, firstSetAt: null, done: false,
      choose: (goal, eventName, weeksOut) => set({ goal, eventName, eventDate: weeksOut ? new Date(Date.now() + weeksOut * 7 * 864e5).toISOString() : null, startedAt: get().startedAt ?? new Date().toISOString() }),
      markOpened: () => { if (!get().openedAt) set({ openedAt: new Date().toISOString() }); },
      markFirstSet: () => { if (!get().firstSetAt) set({ firstSetAt: new Date().toISOString() }); },
      finish: () => set({ done: true }),
    }),
    { name: 'volt.onboarding', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Onboarding is "active" from the goal screen until the first session is saved. */
export const onboardingActive = (o: Pick<Onboarding, 'goal' | 'done'>) => o.goal != null && !o.done;
