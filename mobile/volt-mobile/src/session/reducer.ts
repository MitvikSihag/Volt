export type SetType = 'NORMAL' | 'WARMUP' | 'DROP_SET' | 'FAILURE';
export type SetValues = { weightKg: number | null; reps: number | null };
export type LoggedSet = SetValues & { setType: SetType; at: string };
export type SessionExercise = {
  exerciseId: string; name: string; muscle: string; bodyweight: boolean; restSeconds: number;
  planned: SetValues[]; logged: LoggedSet[];
};
export type ExerciseInput = Omit<SessionExercise, 'logged'>;
export type Session = {
  id: string; title: string; routineId?: string; startedAt: string;
  exercises: SessionExercise[]; currentExercise: number; current: SetValues;
  restUntil: string | null; status: 'live' | 'unsaved' | 'saved';
  finish?: { rpe: number; note: string; completedAt: string };
};

export const DEFAULT_REST = 120;
const EMPTY: SetValues = { weightKg: null, reps: null };

function nextCurrent(ex: SessionExercise | undefined): SetValues {
  if (!ex) return EMPTY;
  const last = ex.logged[ex.logged.length - 1];
  const planned = ex.planned[ex.logged.length];
  if (last) return { weightKg: planned?.weightKg ?? last.weightKg, reps: planned?.reps ?? last.reps };
  return planned ? { weightKg: planned.weightKg, reps: planned.reps } : EMPTY;
}

export function startSession(input: { id: string; title: string; routineId?: string; exercises: ExerciseInput[]; now: string }): Session {
  const exercises = input.exercises.map((e) => ({ ...e, logged: [] as LoggedSet[] }));
  return { id: input.id, title: input.title, routineId: input.routineId, startedAt: input.now, exercises, currentExercise: 0, current: nextCurrent(exercises[0]), restUntil: null, status: 'live' };
}

export const setCurrent = (s: Session, patch: Partial<SetValues>): Session => ({ ...s, current: { ...s.current, ...patch } });

export function step(s: Session, field: keyof SetValues, delta: number): Session {
  const next = Math.max(0, Math.round(((s.current[field] ?? 0) + delta) * 100) / 100);
  return setCurrent(s, { [field]: next });
}

export function logSet(s: Session, now: string, setType: SetType = 'NORMAL'): Session {
  const ex = s.exercises[s.currentExercise];
  if (!ex) return s;
  if (!ex.bodyweight && s.current.weightKg == null) return s;
  if (s.current.reps == null || s.current.reps <= 0) return s;
  const updated: SessionExercise = { ...ex, logged: [...ex.logged, { ...s.current, setType, at: now }] };
  const exercises = s.exercises.map((e, i) => (i === s.currentExercise ? updated : e));
  return { ...s, exercises, current: nextCurrent(updated), restUntil: new Date(Date.parse(now) + ex.restSeconds * 1000).toISOString() };
}

export function removeLoggedSet(s: Session, exIdx: number, setIdx: number): Session {
  const exercises = s.exercises.map((e, i) => (i === exIdx ? { ...e, logged: e.logged.filter((_, j) => j !== setIdx) } : e));
  return { ...s, exercises };
}

export function goToExercise(s: Session, index: number): Session {
  if (index < 0 || index >= s.exercises.length) return s;
  return { ...s, currentExercise: index, current: nextCurrent(s.exercises[index]), restUntil: null };
}

export function addExercise(s: Session, ex: ExerciseInput): Session {
  const next = { ...s, exercises: [...s.exercises, { ...ex, logged: [] as LoggedSet[] }] };
  return s.exercises.length === 0 ? goToExercise(next, 0) : next;
}

export function prefill(s: Session, exerciseId: string, last: SetValues): Session {
  const exercises = s.exercises.map((e) => {
    if (e.exerciseId !== exerciseId) return e;
    const planned = e.planned.length ? e.planned : [{ ...EMPTY }];
    return { ...e, planned: planned.map((p) => ({ weightKg: p.weightKg ?? last.weightKg, reps: p.reps ?? last.reps })) };
  });
  const next = { ...s, exercises };
  const cur = next.exercises[next.currentExercise];
  return cur?.exerciseId === exerciseId && cur.logged.length === 0 ? { ...next, current: nextCurrent(cur) } : next;
}

export const clearRest = (s: Session): Session => ({ ...s, restUntil: null });

export const finishSession = (s: Session, f: { rpe: number; note: string; now: string }): Session =>
  ({ ...s, status: 'unsaved', restUntil: null, finish: { rpe: f.rpe, note: f.note, completedAt: f.now } });

export const markSaved = (s: Session): Session => ({ ...s, status: 'saved' });
export const loggedCount = (s: Session) => s.exercises.reduce((n, e) => n + e.logged.length, 0);
