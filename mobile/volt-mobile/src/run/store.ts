import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Pt } from './geo';

export type Segment = { start: number; end?: number };
type RunState = {
  status: 'idle' | 'recording' | 'paused';
  startedAt: string | null; segments: Segment[]; points: Pt[]; lapMarks: number[]; gps: 'searching' | 'locked';
  start: () => void; pause: () => void; resume: () => void; addPoint: (p: Omit<Pt, 'seg'>) => void; lap: (distanceM: number) => void; setGps: (g: 'searching' | 'locked') => void; reset: () => void;
};

// ponytail: the whole track lives in AsyncStorage; move to SQLite if multi-hour runs make hydration slow.
export const useRun = create<RunState>()(
  persist(
    (set, get) => ({
      status: 'idle', startedAt: null, segments: [], points: [], lapMarks: [], gps: 'searching',
      start: () => set({ status: 'recording', startedAt: new Date().toISOString(), segments: [{ start: Date.now() }], points: [], lapMarks: [], gps: 'searching' }),
      pause: () => set((s) => ({ status: 'paused', segments: s.segments.map((g, i) => (i === s.segments.length - 1 && g.end == null ? { ...g, end: Date.now() } : g)) })),
      resume: () => set((s) => ({ status: 'recording', segments: [...s.segments, { start: Date.now() }] })),
      addPoint: (p) => { const s = get(); if (s.status !== 'recording') return; set({ points: [...s.points, { ...p, seg: s.segments.length - 1 }], gps: 'locked' }); },
      lap: (d) => set((s) => ({ lapMarks: [...s.lapMarks, d] })),
      setGps: (gps) => set({ gps }),
      reset: () => set({ status: 'idle', startedAt: null, segments: [], points: [], lapMarks: [], gps: 'searching' }),
    }),
    { name: 'volt.run', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const activeMs = (segments: Segment[], now = Date.now()) => segments.reduce((n, g) => n + ((g.end ?? now) - g.start), 0);
