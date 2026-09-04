import createClient from 'openapi-fetch';
import { BASE_URL, useAuth } from '@/auth/store';
import type { paths } from './schema';

const authFetch: typeof fetch = async (input, init) => {
  const original = new Request(input, init);
  const send = () => {
    const req = original.clone();
    const token = useAuth.getState().accessToken;
    if (token) req.headers.set('Authorization', `Bearer ${token}`);
    return fetch(req);
  };
  let res = await send();
  if (res.status === 401 && !original.url.includes('/api/auth/') && (await useAuth.getState().refresh())) res = await send();
  return res;
};

export const api = createClient<paths>({ baseUrl: BASE_URL, fetch: authFetch });

type Result<T> = { data?: T; error?: unknown; response: Response };
export async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await p;
  if (response.ok) return data as T;
  const e = error as { message?: string; errors?: { message?: string }[] } | undefined;
  throw new Error(e?.errors?.[0]?.message ?? e?.message ?? `Request failed (${response.status})`);
}
