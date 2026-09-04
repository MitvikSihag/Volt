import { finishSession, logSet, startSession } from './reducer';
import { toRequest } from './toRequest';

const now = '2026-09-21T10:00:00.000Z';
const base = startSession({ id: 's', title: 'Posterior chain', exercises: [
  { exerciseId: 'e1', name: 'Trap bar', muscle: 'HAMSTRINGS', bodyweight: false, restSeconds: 120, planned: [{ weightKg: 147.5, reps: 4 }] },
  { exerciseId: 'e2', name: 'Skipped', muscle: 'CORE', bodyweight: false, restSeconds: 60, planned: [] },
], now });

test('maps only exercises with logged sets; session RPE is its own field', () => {
  const s = finishSession(logSet(base, now), { rpe: 8, note: 'hard', now: '2026-09-21T11:00:00.000Z' });
  expect(toRequest(s)).toEqual({
    title: 'Posterior chain', notes: 'hard', rpe: 8, startedAt: now, completedAt: '2026-09-21T11:00:00.000Z',
    exercises: [{ exerciseId: 'e1', restSeconds: 120, sets: [{ setType: 'NORMAL', reps: 4, weightKg: 147.5, completedAt: now }] }],
  });
});

test('empty note is omitted', () => {
  const s = finishSession(logSet(base, now), { rpe: 7, note: '  ', now });
  expect(toRequest(s).notes).toBeUndefined();
  expect(toRequest(s).rpe).toBe(7);
});

test('duration and distance exercises map reps to seconds / metres', () => {
  const s0 = startSession({ id: 's', title: 'Carries', exercises: [
    { exerciseId: 'p', name: 'Plank', muscle: 'CORE', bodyweight: true, measurement: 'DURATION', restSeconds: 60, planned: [{ weightKg: null, reps: 60 }] },
    { exerciseId: 'f', name: "Farmer's Walk", muscle: 'FOREARMS', bodyweight: false, measurement: 'DISTANCE', restSeconds: 90, planned: [{ weightKg: 32, reps: 40 }] },
  ], now });
  const s1 = logSet(s0, now); const s2 = logSet({ ...s1, currentExercise: 1, current: { weightKg: 32, reps: 40 } }, now);
  const r = toRequest(finishSession(s2, { rpe: 6, note: '', now }));
  expect(r.exercises?.[0].sets[0]).toEqual({ setType: 'NORMAL', completedAt: now, durationSeconds: 60 });
  expect(r.exercises?.[1].sets[0]).toEqual({ setType: 'NORMAL', completedAt: now, distanceMeters: 40, weightKg: 32 });
});

test('throws when not finished', () => {
  expect(() => toRequest(base)).toThrow('not finished');
});
