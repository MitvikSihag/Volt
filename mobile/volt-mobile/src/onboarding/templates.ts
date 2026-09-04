import type { ExerciseInput } from '@/session/reducer';
import { useSettings } from '@/settings/store';

export type Goal = 'hyrox' | 'half' | 'lift' | 'fit';
type Lift = { name: string; muscle: string; bodyweight?: boolean; sets: number; reps: number; rest?: number };
export type PlannedSession = { day: number; kind: 'lift' | 'run'; title: string; minutes: number; lifts?: Lift[]; detail?: string };

export const GOALS: { k: Goal; title: string; sub: string; event?: string }[] = [
  { k: 'hyrox', title: 'A Hyrox race', sub: 'Pick how far out', event: 'Hyrox' },
  { k: 'half', title: 'A half marathon', sub: 'Pick how far out', event: 'Half marathon' },
  { k: 'lift', title: 'A lift number', sub: 'Squat, bench, deadlift…' },
  { k: 'fit', title: 'Stay strong and fit', sub: 'No date · rolling plan' },
];

// Exercise names are the backend seed names; they resolve to ids once an account exists.
const L = (name: string, muscle: string, sets: number, reps: number, bodyweight = false, rest = 120): Lift => ({ name, muscle, sets, reps, bodyweight, rest });
export const WEEK: Record<Goal, PlannedSession[]> = {
  hyrox: [
    { day: 0, kind: 'lift', title: 'Posterior chain + sled', minutes: 70, lifts: [L('Barbell Deadlift', 'HAMSTRINGS', 5, 4, false, 150), L('Romanian Deadlift', 'HAMSTRINGS', 3, 8), L('Barbell Row', 'BACK', 4, 8), L('Pull-Up', 'BACK', 4, 8, true), L('Hanging Leg Raise', 'CORE', 3, 12, true, 90)] },
    { day: 1, kind: 'run', title: 'Threshold 6 × 800 m', minutes: 55, detail: '12 km' },
    { day: 3, kind: 'lift', title: 'Push + carries', minutes: 60, lifts: [L('Barbell Bench Press', 'CHEST', 5, 5, false, 150), L('Barbell Overhead Press', 'SHOULDERS', 4, 6), L("Farmer's Walk", 'FOREARMS', 4, 40), L('Push-Up', 'CHEST', 3, 15, true, 90), L('Plank', 'CORE', 3, 60, true, 60)] },
    { day: 5, kind: 'run', title: 'Long easy 16 km', minutes: 95, detail: 'Zone 2' },
  ],
  half: [
    { day: 0, kind: 'lift', title: 'Strength for runners', minutes: 45, lifts: [L('Barbell Back Squat', 'QUADRICEPS', 4, 6, false, 150), L('Romanian Deadlift', 'HAMSTRINGS', 3, 8), L('Walking Lunge', 'QUADRICEPS', 3, 12), L('Plank', 'CORE', 3, 60, true, 60)] },
    { day: 1, kind: 'run', title: 'Threshold 5 × 1 km', minutes: 50, detail: '10 km' },
    { day: 3, kind: 'run', title: 'Easy 8 km', minutes: 45, detail: 'Zone 2' },
    { day: 5, kind: 'run', title: 'Long run 14 km', minutes: 80, detail: 'Zone 2' },
  ],
  lift: [
    { day: 0, kind: 'lift', title: 'Squat day', minutes: 65, lifts: [L('Barbell Back Squat', 'QUADRICEPS', 5, 5, false, 180), L('Leg Press', 'QUADRICEPS', 3, 10), L('Lying Leg Curl', 'HAMSTRINGS', 3, 12, false, 90), L('Standing Calf Raise', 'CALVES', 3, 15, false, 60)] },
    { day: 2, kind: 'lift', title: 'Bench day', minutes: 60, lifts: [L('Barbell Bench Press', 'CHEST', 5, 5, false, 180), L('Incline Dumbbell Bench Press', 'CHEST', 3, 10), L('Barbell Row', 'BACK', 4, 8), L('Tricep Pushdown', 'TRICEPS', 3, 12, false, 60)] },
    { day: 4, kind: 'lift', title: 'Deadlift day', minutes: 65, lifts: [L('Barbell Deadlift', 'HAMSTRINGS', 5, 3, false, 180), L('Pull-Up', 'BACK', 4, 8, true), L('Hip Thrust', 'GLUTES', 3, 10), L('Hanging Leg Raise', 'CORE', 3, 12, true, 90)] },
    { day: 5, kind: 'run', title: 'Easy 5 km', minutes: 30, detail: 'Zone 2' },
  ],
  fit: [
    { day: 0, kind: 'lift', title: 'Full body A', minutes: 50, lifts: [L('Goblet Squat', 'QUADRICEPS', 3, 10), L('Dumbbell Bench Press', 'CHEST', 3, 10), L('Dumbbell Row', 'BACK', 3, 10), L('Plank', 'CORE', 3, 45, true, 60)] },
    { day: 2, kind: 'run', title: 'Easy 5 km', minutes: 30, detail: 'Zone 2' },
    { day: 4, kind: 'lift', title: 'Full body B', minutes: 50, lifts: [L('Romanian Deadlift', 'HAMSTRINGS', 3, 10), L('Barbell Overhead Press', 'SHOULDERS', 3, 8), L('Lat Pulldown', 'BACK', 3, 10), L('Kettlebell Swing', 'GLUTES', 3, 15, false, 60)] },
    { day: 6, kind: 'run', title: 'Long walk or run 8 km', minutes: 60, detail: 'Zone 2' },
  ],
};

export const localId = (name: string) => `local:${name}`;
export const isLocalId = (id: string) => id.startsWith('local:');
export const localName = (id: string) => id.slice('local:'.length);

export function toSession(s: PlannedSession): ExerciseInput[] {
  return (s.lifts ?? []).map((l) => ({
    exerciseId: localId(l.name), name: l.name, muscle: l.muscle, bodyweight: !!l.bodyweight, restSeconds: l.rest ?? useSettings.getState().restSeconds,
    planned: Array.from({ length: l.sets }, () => ({ weightKg: null, reps: l.reps })),
  }));
}
