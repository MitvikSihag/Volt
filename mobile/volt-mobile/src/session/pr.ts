import type { components } from '@/api/schema';
import type { SetValues } from './reducer';
type Rec = components['schemas']['PersonalRecordResponse'];

export const epley = (w: number, r: number) => w * (1 + r / 30);

export function isPr(set: SetValues, records: Rec[]): boolean {
  if (records.length === 0 || set.weightKg == null || set.reps == null || set.reps <= 0) return false;
  const best = (t: Rec['type']) => records.find((r) => r.type === t)?.value ?? 0;
  return set.weightKg > best('MAX_WEIGHT') || (set.reps <= 10 && epley(set.weightKg, set.reps) > best('ONE_REP_MAX'));
}

export function prLabel(records: Rec[]): string | null {
  const w = records.find((r) => r.type === 'MAX_WEIGHT')?.value;
  return w ? `PR ${w} KG` : null;
}
