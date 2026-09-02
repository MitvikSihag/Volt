import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { components } from './schema';

export type S = components['schemas'];

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => unwrap(api.GET('/api/users/me')) });
export const useExercises = (q = '') => useQuery({ queryKey: ['exercises', q], queryFn: () => unwrap(api.GET('/api/exercises', { params: { query: q ? { q } : {} } })) });
export const useRoutines = () => useQuery({ queryKey: ['routines'], queryFn: () => unwrap(api.GET('/api/routines')) });
export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => unwrap(api.GET('/api/dashboard')) });
export const useLastSets = (exerciseIds: string[]) => useQuery({
  queryKey: ['last-sets', exerciseIds], enabled: exerciseIds.length > 0,
  queryFn: () => unwrap(api.GET('/api/workouts/last-sets', { params: { query: { exerciseIds } } })),
});
export const useRecords = (id?: string) => useQuery({
  queryKey: ['records', id], enabled: !!id,
  queryFn: () => unwrap(api.GET('/api/exercises/{id}/records', { params: { path: { id: id! } } })),
});
export const useWorkout = (id?: string) => useQuery({
  queryKey: ['workout', id], enabled: !!id,
  queryFn: () => unwrap(api.GET('/api/workouts/{id}', { params: { path: { id: id! } } })),
});
export function useSaveWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: S['CreateWorkoutRequest']) => unwrap(api.POST('/api/workouts', { body })),
    onSuccess: (w) => {
      qc.setQueryData(['workout', w.id], w);
      for (const k of ['dashboard', 'last-sets', 'records']) void qc.invalidateQueries({ queryKey: [k] });
    },
  });
}
