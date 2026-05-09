import { create } from 'zustand';
import { Exercise, WorkoutExercise, WorkoutSet, SetType } from '../types';

interface ActiveSet {
  reps: string;
  weight: string;
  setType: SetType;
  completed: boolean;
}

interface ActiveExercise {
  id: string;
  exercise: Exercise;
  sets: ActiveSet[];
  notes: string;
}

interface WorkoutSession {
  title: string;
  startedAt: Date;
  exercises: ActiveExercise[];
  restTimerSeconds: number;
  restTimerActive: boolean;
}

interface WorkoutState {
  session: WorkoutSession | null;
  startWorkout: (title?: string) => void;
  endWorkout: () => WorkoutSession | null;
  discardWorkout: () => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  updateSet: (exerciseId: string, setIndex: number, field: 'reps' | 'weight', value: string) => void;
  toggleSetComplete: (exerciseId: string, setIndex: number) => void;
  updateSetType: (exerciseId: string, setIndex: number, type: SetType) => void;
  updateExerciseNotes: (exerciseId: string, notes: string) => void;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  tickRestTimer: () => void;
}

let exerciseCounter = 0;

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  session: null,

  startWorkout: (title = 'New Workout') => {
    set({
      session: {
        title,
        startedAt: new Date(),
        exercises: [],
        restTimerSeconds: 0,
        restTimerActive: false,
      },
    });
  },

  endWorkout: () => {
    const session = get().session;
    set({ session: null });
    return session;
  },

  discardWorkout: () => set({ session: null }),

  addExercise: (exercise) => {
    set((state) => {
      if (!state.session) return state;
      const newExercise: ActiveExercise = {
        id: `ae-${++exerciseCounter}`,
        exercise,
        sets: [{ reps: '', weight: '', setType: 'normal', completed: false }],
        notes: '',
      };
      return {
        session: { ...state.session, exercises: [...state.session.exercises, newExercise] },
      };
    });
  },

  removeExercise: (exerciseId) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          exercises: state.session.exercises.filter((e) => e.id !== exerciseId),
        },
      };
    });
  },

  addSet: (exerciseId) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          exercises: state.session.exercises.map((e) =>
            e.id === exerciseId
              ? { ...e, sets: [...e.sets, { reps: '', weight: '', setType: 'normal', completed: false }] }
              : e
          ),
        },
      };
    });
  },

  removeSet: (exerciseId, setIndex) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          exercises: state.session.exercises.map((e) =>
            e.id === exerciseId
              ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
              : e
          ),
        },
      };
    });
  },

  updateSet: (exerciseId, setIndex, field, value) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          exercises: state.session.exercises.map((e) =>
            e.id === exerciseId
              ? {
                  ...e,
                  sets: e.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)),
                }
              : e
          ),
        },
      };
    });
  },

  toggleSetComplete: (exerciseId, setIndex) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          exercises: state.session.exercises.map((e) =>
            e.id === exerciseId
              ? {
                  ...e,
                  sets: e.sets.map((s, i) =>
                    i === setIndex ? { ...s, completed: !s.completed } : s
                  ),
                }
              : e
          ),
        },
      };
    });
  },

  updateSetType: (exerciseId, setIndex, type) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          exercises: state.session.exercises.map((e) =>
            e.id === exerciseId
              ? { ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...s, setType: type } : s)) }
              : e
          ),
        },
      };
    });
  },

  updateExerciseNotes: (exerciseId, notes) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          exercises: state.session.exercises.map((e) =>
            e.id === exerciseId ? { ...e, notes } : e
          ),
        },
      };
    });
  },

  startRestTimer: (seconds) => {
    set((state) => ({
      session: state.session ? { ...state.session, restTimerSeconds: seconds, restTimerActive: true } : null,
    }));
  },

  stopRestTimer: () => {
    set((state) => ({
      session: state.session ? { ...state.session, restTimerActive: false, restTimerSeconds: 0 } : null,
    }));
  },

  tickRestTimer: () => {
    set((state) => {
      if (!state.session || !state.session.restTimerActive) return state;
      const next = state.session.restTimerSeconds - 1;
      return {
        session: { ...state.session, restTimerSeconds: next, restTimerActive: next > 0 },
      };
    });
  },
}));
