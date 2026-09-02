import { finishSession, logSet, startSession } from './reducer';
import { toRequest } from './toRequest';

const now = '2026-09-21T10:00:00.000Z';
const base = startSession({ id: 's', title: 'Posterior chain', exercises: [
  { exerciseId: 'e1', name: 'Trap bar', muscle: 'HAMSTRINGS', bodyweight: false, restSeconds: 120, planned: [{ weightKg: 147.5, reps: 4 }] },
  { exerciseId: 'e2', name: 'Skipped', muscle: 'CORE', bodyweight: false, restSeconds: 60, planned: [] },
], now });

test('maps only exercises with logged sets, prefixes RPE into notes', () => {
  const s = finishSession(logSet(base, now), { rpe: 8, note: 'hard', now: '2026-09-21T11:00:00.000Z' });
  expect(toRequest(s)).toEqual({
    title: 'Posterior chain', notes: 'RPE 8 · hard', startedAt: now, completedAt: '2026-09-21T11:00:00.000Z',
    exercises: [{ exerciseId: 'e1', restSeconds: 120, sets: [{ setType: 'NORMAL', reps: 4, weightKg: 147.5, completedAt: now }] }],
  });
});

test('empty note yields just the RPE', () => {
  const s = finishSession(logSet(base, now), { rpe: 7, note: '  ', now });
  expect(toRequest(s).notes).toBe('RPE 7');
});

test('throws when not finished', () => {
  expect(() => toRequest(base)).toThrow('not finished');
});
