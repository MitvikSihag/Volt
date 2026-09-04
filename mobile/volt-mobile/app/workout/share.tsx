import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import { useExercises, useWorkout } from '@/api/queries';
import { formatElapsed, humanMuscle } from '@/session/fromRoutine';
import { useSession } from '@/session/store';
import { useUnits } from '@/settings/units';
import { Bolt } from '@/ui/Bolt';
import { Body, Button, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color, font } from '@/ui/tokens';

const FIELDS = [['volume', 'Total volume'], ['duration', 'Duration'], ['sets', 'Set table'], ['muscles', 'Muscles worked'], ['records', 'Records']] as const;
type Field = (typeof FIELDS)[number][0];
const CARD_W = 1080, CARD_H = 1920;

export default function ShareCard() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { id } = useLocalSearchParams<{ id: string }>();
  const { data: w } = useWorkout(id); const { data: exercises } = useExercises(); const session = useSession((s) => s.session); const { fmt, unit } = useUnits();
  const [on, setOn] = useState<Record<Field, boolean>>({ volume: true, duration: true, sets: true, muscles: true, records: true });
  const shot = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const muscleOf = new Map((exercises ?? []).map((e) => [e.id ?? '', e.primaryMuscleGroup ?? 'FULL_BODY']));
  const muscles = new Map<string, number>();
  for (const e of w?.exercises ?? []) { const m = muscleOf.get(e.exerciseId ?? '') ?? 'FULL_BODY'; muscles.set(m, (muscles.get(m) ?? 0) + (e.sets?.length ?? 0)); }
  const prs = (w?.exercises ?? []).flatMap((e) => (e.sets ?? []).filter((s) => s.isPr).map((s) => ({ name: e.exerciseName, w: s.weightKg, r: s.reps })));
  const duration = w?.startedAt && w?.completedAt ? formatElapsed(Date.parse(w.completedAt) - Date.parse(w.startedAt)) : null;
  const date = w?.startedAt ? new Date(w.startedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase() : '';
  const scale = 0.28;

  const share = async () => {
    try {
      const uri = await shot.current?.capture?.();
      if (!uri) throw new Error('capture failed');
      await Share.share({ url: uri, message: w?.title ?? session?.title ?? 'Volt' });
    } catch (e) { Alert.alert("Couldn't build the card", e instanceof Error ? e.message : 'Try again'); }
  };

  return (
    <Zone style={{ flex: 1, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
        <Meta tone="t3">Story · 1080 × 1920</Meta>
        <View style={{ width: 18 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}>
        <Heading>Share</Heading>
        <Body tone="t2" size={13} style={{ marginTop: 4 }}>Every field is yours to hide. What's off stays off the card.</Body>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 24 }}>
          <View style={{ flex: 1 }}>
            {FIELDS.map(([k, l]) => (
              <View key={k}>
                <Pressable onPress={() => setOn({ ...on, [k]: !on[k] })} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: on[k] ? color.t1 : color.t4, backgroundColor: on[k] ? color.t1 : 'transparent' }} />
                  <Body size={14} tone={on[k] ? 't1' : 't3'}>{l}</Body>
                </Pressable>
                <Hairline />
              </View>
            ))}
          </View>
          <View style={{ width: CARD_W * scale, height: CARD_H * scale, borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ width: CARD_W, height: CARD_H, transform: [{ translateX: -(CARD_W * (1 - scale)) / 2 }, { translateY: -(CARD_H * (1 - scale)) / 2 }, { scale }] }}>
              <ViewShot ref={shot} options={{ format: 'png', width: CARD_W, height: CARD_H }} style={{ width: CARD_W, height: CARD_H }}>
                <Card />
              </ViewShot>
            </View>
          </View>
        </View>
        <View style={{ height: 28 }} />
        <Button label="Share card" onPress={share} disabled={!w} />
      </ScrollView>
    </Zone>
  );

  function Card() {
    return (
      <View style={{ flex: 1, backgroundColor: color.sunken, padding: 96 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Bolt size={72} />
          <Mono tone="t3" size={30}>{date}</Mono>
        </View>
        <Heading size={84} style={{ marginTop: 120 }}>{w?.title ?? session?.title}</Heading>
        {on.volume && (<>
          <Numeral size={300} style={{ marginTop: 100 }}>{fmt(w?.totalVolumeKg)}</Numeral>
          <Body tone="t2" size={40}>Total volume · {unit}</Body>
        </>)}
        {on.duration && duration && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 80, paddingVertical: 28, borderTopWidth: 2, borderBottomWidth: 2, borderColor: color.hairline }}>
            <Body tone="t2" size={40}>Duration</Body><Mono size={40}>{duration}</Mono>
          </View>
        )}
        {on.sets && (
          <View style={{ marginTop: 60, gap: 20 }}>
            {(w?.exercises ?? []).slice(0, 5).map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body size={38} style={{ flex: 1 }} numberOfLines={1}>{e.exerciseName}</Body>
                <Mono tone="t2" size={36}>{(e.sets ?? []).map((s) => `${fmt(s.weightKg)}×${s.reps}`).slice(0, 4).join('  ')}</Mono>
              </View>
            ))}
          </View>
        )}
        {on.muscles && muscles.size > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 60 }}>
            {[...muscles.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => (
              <View key={m} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 28, height: 68, borderRadius: 34, backgroundColor: color.raised, alignItems: 'center' }}>
                <Body size={32}>{humanMuscle(m)}</Body><Mono tone="t3" size={28}>{n}</Mono>
              </View>
            ))}
          </View>
        )}
        {on.records && prs.map((p, i) => (
          <View key={i} style={{ marginTop: i === 0 ? 60 : 20 }}>
            <Body size={38} style={{ color: color.gold }}>★ {p.name} — {p.r}-rep best</Body>
            <Mono tone="t2" size={32}>{fmt(p.w)} {unit} × {p.r}</Mono>
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          <Bolt size={56} />
          <Mono size={40} style={{ fontFamily: font.sansSemi, letterSpacing: -1 }}>Volt</Mono>
        </View>
      </View>
    );
  }
}
