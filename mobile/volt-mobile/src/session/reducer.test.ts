import { addExercise, finishSession, goToExercise, logSet, loggedCount, prefill, startSession, step, ExerciseInput } from './reducer';

const now = '2026-09-21T10:00:00.000Z';
const trap: ExerciseInput = { exerciseId: 'e1', name: 'Trap bar deadlift', muscle: 'HAMSTRINGS', bodyweight: false, restSeconds: 120, planned: [{ weightKg: 147.5, reps: 4 }, { weightKg: 147.5, reps: 4 }, { weightKg: 150, reps: 4 }] };
const pullup: ExerciseInput = { exerciseId: 'e2', name: 'Pull-up', muscle: 'BACK', bodyweight: true, restSeconds: 90, planned: [{ weightKg: null, reps: 8 }] };
const fresh = () => startSession({ id: 's1', title: 'Posterior chain', exercises: [trap, pullup], now });

test('start seeds current from the first planned set', () => {
  expect(fresh().current).toEqual({ weightKg: 147.5, reps: 4 });
  expect(fresh().status).toBe('live');
});

test('step rounds to 2 decimals and never goes below 0', () => {
  expect(step(fresh(), 'weightKg', 2.5).current.weightKg).toBe(150);
  expect(step(step(fresh(), 'reps', -4), 'reps', -1).current.reps).toBe(0);
});

test('logSet appends, arms rest, and advances current to the next planned set', () => {
  const s = logSet(logSet(fresh(), now), '2026-09-21T10:03:00.000Z');
  expect(s.exercises[0].logged).toHaveLength(2);
  expect(s.exercises[0].logged[0]).toMatchObject({ weightKg: 147.5, reps: 4, setType: 'NORMAL', at: now });
  expect(s.current).toEqual({ weightKg: 150, reps: 4 });
  expect(s.restUntil).toBe('2026-09-21T10:05:00.000Z');
});

test('logSet refuses an empty set', () => {
  const s = step(fresh(), 'reps', -4);
  expect(logSet(s, now)).toBe(s);
});

test('bodyweight exercise logs with null weight', () => {
  const s = logSet(goToExercise(fresh(), 1), now);
  expect(s.exercises[1].logged[0]).toMatchObject({ weightKg: null, reps: 8 });
});

test('prefill fills null planned weights and current from last session', () => {
  const adhoc = startSession({ id: 's2', title: 'Ad hoc', exercises: [{ ...trap, planned: [{ weightKg: null, reps: 5 }] }], now });
  const s = prefill(adhoc, 'e1', { weightKg: 140, reps: 5 });
  expect(s.exercises[0].planned[0]).toEqual({ weightKg: 140, reps: 5 });
  expect(s.current).toEqual({ weightKg: 140, reps: 5 });
});

test('addExercise to an empty session makes it current', () => {
  const s = addExercise(startSession({ id: 's3', title: 'Empty', exercises: [], now }), trap);
  expect(s.currentExercise).toBe(0);
  expect(s.current).toEqual({ weightKg: 147.5, reps: 4 });
});

test('finishSession marks unsaved and records rpe/note', () => {
  const s = finishSession(logSet(fresh(), now), { rpe: 8, note: 'hard', now: '2026-09-21T11:08:12.000Z' });
  expect(s.status).toBe('unsaved');
  expect(s.finish).toEqual({ rpe: 8, note: 'hard', completedAt: '2026-09-21T11:08:12.000Z' });
  expect(loggedCount(s)).toBe(1);
});
