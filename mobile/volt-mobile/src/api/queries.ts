import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './client';
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => unwrap(api.GET('/api/users/me')) });
