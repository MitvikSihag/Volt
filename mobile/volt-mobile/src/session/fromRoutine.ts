import type { S } from '@/api/queries';
import { useSettings } from '@/settings/store';
import { ExerciseInput } from './reducer';
const DEFAULT_REST = () => useSettings.getState().restSeconds;

export function fromRoutine(r: S['RoutineResponse'], byId: Map<string, S['ExerciseResponse']>): ExerciseInput[] {
  return (r.exercises ?? []).map((re) => {
    const ex = byId.get(re.exerciseId ?? '');
    const sets = Math.max(1, re.targetSets ?? 3);
    return {
      exerciseId: re.exerciseId ?? '', name: re.exerciseName ?? ex?.name ?? 'Exercise',
      muscle: ex?.primaryMuscleGroup ?? 'FULL_BODY', bodyweight: (ex?.measurementType ?? (ex?.equipment === 'BODYWEIGHT' ? 'REPS_ONLY' : 'REPS_WEIGHT')) !== 'REPS_WEIGHT', measurement: ex?.measurementType ?? (ex?.equipment === 'BODYWEIGHT' ? 'REPS_ONLY' : 'REPS_WEIGHT'),
      restSeconds: re.restSeconds ?? DEFAULT_REST(),
      planned: Array.from({ length: sets }, () => ({ weightKg: null, reps: re.targetReps ?? null })),
    };
  });
}

export function toInput(ex: S['ExerciseResponse']): ExerciseInput {
  const measurement = ex.measurementType ?? (ex.equipment === 'BODYWEIGHT' ? 'REPS_ONLY' : 'REPS_WEIGHT');
  return { exerciseId: ex.id ?? '', name: ex.name ?? 'Exercise', muscle: ex.primaryMuscleGroup ?? 'FULL_BODY', bodyweight: measurement !== 'REPS_WEIGHT', measurement, restSeconds: DEFAULT_REST(), planned: [] };
}

export const formatElapsed = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};
export const humanMuscle = (m: string) => m.toLowerCase().replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
