export const color = {
  base: '#121212', sunken: '#0D0D0D', raised: '#171717', hero: '#000000',
  ember: '#FF5A1F', jade: '#31A98D', gold: '#D9B45B', yellow: '#E5C04B',
  t1: '#FAFAFA', t2: '#A8A8AA', t3: '#6E6E70', t4: '#58585A', hairline: '#242424',
} as const;
export type Tone = 't1' | 't2' | 't3' | 't4' | 'ember' | 'jade' | 'gold' | 'yellow';
export const font = {
  sans: 'Inter_400Regular', sansMed: 'Inter_500Medium', sansSemi: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular', monoMed: 'JetBrainsMono_500Medium', monoBold: 'JetBrainsMono_700Bold',
} as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
