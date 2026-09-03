import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Visibility = 'EVERYONE' | 'FRIENDS' | 'ONLY_ME';
export type ShareField = 'pace' | 'distance' | 'load' | 'heartRate' | 'photos' | 'splits';
type Settings = {
  visibility: Visibility; trimMeters: number; hideStart: boolean; hideEnd: boolean; share: Record<ShareField, boolean>;
  set: (patch: Partial<Omit<Settings, 'set' | 'reset'>>) => void; reset: () => void;
};
const DEFAULTS = { visibility: 'FRIENDS' as Visibility, trimMeters: 200, hideStart: true, hideEnd: false, share: { pace: true, distance: true, load: true, heartRate: false, photos: false, splits: false } };

// Privacy lives on the phone until the API grows visibility fields; trimming is applied before a route is uploaded.
export const useSettings = create<Settings>()(
  persist((set) => ({ ...DEFAULTS, set: (patch) => set(patch), reset: () => set(DEFAULTS) }), { name: 'volt.settings', storage: createJSONStorage(() => AsyncStorage) }),
);
