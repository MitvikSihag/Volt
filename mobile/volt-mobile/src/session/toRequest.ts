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
