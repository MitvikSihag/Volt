import { useSettings } from './store';

export const KG_PER_LB = 0.45359237;

/** Display helpers for the kg/lb setting. Weights are always stored in kg. */
export function useUnits() {
  const unit = useSettings((s) => s.unit);
  const toDisplay = (kg: number) => (unit === 'lb' ? Math.round((kg / KG_PER_LB) * 10) / 10 : Math.round(kg * 100) / 100);
  return { unit, toDisplay, fmt: (kg: number | null | undefined) => (kg == null ? '—' : toDisplay(kg).toLocaleString()), stepKg: unit === 'lb' ? 5 * KG_PER_LB : 2.5, stepLabel: unit === 'lb' ? '5 lb' : '2.5 kg' };
}

/** Greedy plates per side for `weightKg` on a `barKg` bar. Returns [] when the bar alone is enough. */
export function platesPerSide(weightKg: number, barKg: number, plates: number[]): number[] {
  let rest = (weightKg - barKg) / 2; const out: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) while (rest >= p - 1e-9) { out.push(p); rest -= p; }
  return out;
}
