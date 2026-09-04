import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Visibility = 'EVERYONE' | 'FRIENDS' | 'ONLY_ME';
export type ShareField = 'pace' | 'distance' | 'load' | 'heartRate' | 'photos' | 'splits';
export type PrType = 'ONE_REP_MAX' | 'MAX_WEIGHT' | 'MAX_VOLUME' | 'MAX_REPS_AT_WEIGHT';
type Values = {
  unit: 'kg' | 'lb'; restSeconds: number; barKg: number; plates: number[];
  prTypes: Record<PrType, boolean>; competition: { rivals: boolean; boards: boolean; challenges: boolean };
  visibility: Visibility; trimMeters: number; hideStart: boolean; hideEnd: boolean; share: Record<ShareField, boolean>;
};
type Settings = Values & { set: (patch: Partial<Values>) => void; reset: () => void };
const DEFAULTS: Values = {
  unit: 'kg', restSeconds: 120, barKg: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  prTypes: { ONE_REP_MAX: true, MAX_WEIGHT: true, MAX_VOLUME: true, MAX_REPS_AT_WEIGHT: true },
  competition: { rivals: true, boards: true, challenges: true },
  visibility: 'FRIENDS', trimMeters: 200, hideStart: true, hideEnd: false,
  share: { pace: true, distance: true, load: true, heartRate: false, photos: false, splits: false },
};

// Settings live on the phone until the API grows them; privacy trimming is applied before a route is uploaded.
export const useSettings = create<Settings>()(
  persist((set) => ({ ...DEFAULTS, set: (patch) => set(patch), reset: () => set(DEFAULTS) }), { name: 'volt.settings', storage: createJSONStorage(() => AsyncStorage) }),
);
