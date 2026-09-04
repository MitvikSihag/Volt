import type { components } from '@/api/schema';
import type { Session } from './reducer';

export type CreateWorkoutRequest = components['schemas']['CreateWorkoutRequest'];

export function toRequest(s: Session): CreateWorkoutRequest {
  if (!s.finish) throw new Error('session not finished');
  const notes = s.finish.note.trim() || undefined;
  return {
    title: s.title, notes, rpe: s.finish.rpe, startedAt: s.startedAt, completedAt: s.finish.completedAt,
    exercises: s.exercises.filter((e) => e.logged.length > 0).map((e) => ({
      exerciseId: e.exerciseId, restSeconds: e.restSeconds,
      sets: e.logged.map((l) => ({
        setType: l.setType, completedAt: l.at,
        ...(e.measurement === 'DURATION' ? { durationSeconds: l.reps ?? undefined }
          : e.measurement === 'DISTANCE' ? { distanceMeters: l.reps ?? undefined, weightKg: l.weightKg ?? undefined }
          : e.measurement === 'REPS_ONLY' ? { reps: l.reps ?? undefined }
          : { reps: l.reps ?? undefined, weightKg: l.weightKg ?? undefined }),
      })),
    })),
  };
}
