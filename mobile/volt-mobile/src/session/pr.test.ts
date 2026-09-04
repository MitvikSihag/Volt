import { epley, isPr, prLabel } from './pr';
const records = [{ type: 'MAX_WEIGHT', value: 140 }, { type: 'ONE_REP_MAX', value: 160 }] as any;
test('epley', () => expect(epley(100, 3)).toBeCloseTo(110));
test('heavier than max weight is a PR', () => expect(isPr({ weightKg: 142.5, reps: 1 }, records)).toBe(true));
test('higher e1RM is a PR', () => expect(isPr({ weightKg: 140, reps: 6 }, records)).toBe(true));
test('neither is not', () => expect(isPr({ weightKg: 120, reps: 4 }, records)).toBe(false));
test('no records means first set is not flagged', () => expect(isPr({ weightKg: 100, reps: 5 }, [])).toBe(false));
test('label', () => expect(prLabel(records)).toBe('PR 140 KG'));
