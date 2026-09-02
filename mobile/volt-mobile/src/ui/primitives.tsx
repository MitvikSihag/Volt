import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, PressableProps, StyleSheet, Text, TextProps, View, ViewProps } from 'react-native';
import { color, font, Tone } from './tokens';

type T = TextProps & { tone?: Tone; size?: number };

export const Numeral = ({ tone = 't1', size = 96, style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.monoBold, fontSize: size, lineHeight: size * 1.05, color: color[tone], letterSpacing: -size * 0.04 }, style]} />
);
export const Meta = ({ tone = 't3', style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.mono, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: color[tone] }, style]} />
);
export const Mono = ({ tone = 't1', size = 15, style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.mono, fontSize: size, color: color[tone] }, style]} />
);
export const Body = ({ tone = 't1', size = 15, style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.sans, fontSize: size, lineHeight: size * 1.4, color: color[tone] }, style]} />
);
export const Heading = ({ tone = 't1', size = 28, style, ...p }: T) => (
  <Text {...p} style={[{ fontFamily: font.sansSemi, fontSize: size, lineHeight: size * 1.15, letterSpacing: -0.5, color: color[tone] }, style]} />
);
export const Zone = ({ level = 'base', style, ...p }: ViewProps & { level?: 'base' | 'sunken' | 'raised' | 'hero' }) => (
  <View {...p} style={[{ backgroundColor: color[level] }, style]} />
);
export const Hairline = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.hairline }} />;

export const Button = ({ label, tone = 'primary', disabled, ...p }: PressableProps & { label: string; tone?: 'primary' | 'ghost' }) => (
  <Pressable
    {...p}
    disabled={disabled}
    style={({ pressed }) => ({
      height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
      backgroundColor: tone === 'primary' ? color.t1 : color.raised, opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
    })}
  >
    <Text style={{ fontFamily: font.sansSemi, fontSize: 16, color: tone === 'primary' ? color.sunken : color.t1 }}>{label}</Text>
  </Pressable>
);

export const Stepper = ({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) => (
  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 24, backgroundColor: color.raised, paddingHorizontal: 4 }}>
    <Pressable onPress={onMinus} hitSlop={8} style={{ width: 44, alignItems: 'center' }}><Mono tone="t2" size={18}>−</Mono></Pressable>
    <Meta style={{ flex: 1, textAlign: 'center' }}>{label}</Meta>
    <Pressable onPress={onPlus} hitSlop={8} style={{ width: 44, alignItems: 'center' }}><Mono tone="t2" size={18}>+</Mono></Pressable>
  </View>
);

export const TierChip = ({ label, tone = 'ember' }: { label: string; tone?: Tone }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: color[tone] + '1F' }}>
    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color[tone] }} />
    <Meta tone={tone}>{label}</Meta>
  </View>
);

export const HeaderWash = ({ tone = 'ember', height = 280 }: { tone?: 'ember' | 'jade'; height?: number }) => (
  <LinearGradient colors={[color[tone] + "2E", color[tone] + "00"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height, pointerEvents: "none" }} />
);
