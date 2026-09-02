import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkout } from '@/api/queries';
import { formatElapsed, humanMuscle } from '@/session/fromRoutine';
import { loggedCount } from '@/session/reducer';
import { useSession } from '@/session/store';
import { Body, Button, HeaderWash, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function Summary() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>();
  const { data: w } = useWorkout(id);
  const session = useSession((s) => s.session); const discard = useSession((s) => s.discard);
  const muscles = new Map<string, number>();
  for (const e of session?.exercises ?? []) if (e.logged.length) muscles.set(e.muscle, (muscles.get(e.muscle) ?? 0) + e.logged.length);
  const prs = (w?.exercises ?? []).flatMap((e) => (e.sets ?? []).filter((s) => s.isPr).map((s) => ({ name: e.exerciseName, w: s.weightKg, r: s.reps })));
  const started = w?.startedAt ?? session?.startedAt; const ended = w?.completedAt ?? session?.finish?.completedAt;
  const date = started ? new Date(started).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const done = () => { discard(); router.replace('/(tabs)'); };

  return (
    <Zone style={{ flex: 1 }}>
      <HeaderWash tone="ember" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <Heading size={26}>{w?.title ?? session?.title}</Heading>
          <Meta style={{ marginTop: 6 }}>{date}{ended && started ? ` · ${formatElapsed(Date.parse(ended) - Date.parse(started))}` : ''}</Meta>
          <Numeral style={{ marginTop: 40 }}>{w?.totalVolumeKg == null ? '—' : Math.round(w.totalVolumeKg).toLocaleString()}</Numeral>
          <Body tone="t2">Total volume · kg</Body>
          <View style={{ height: 32 }} /><Hairline />
          <View style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between' }}><Body tone="t2">Sets</Body><Mono>{session ? loggedCount(session) : 0}</Mono></View>
          <Hairline />
          <Meta style={{ marginTop: 24 }}>Muscles worked · sets</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {[...muscles.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => (
              <View key={m} style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: color.raised, alignItems: 'center' }}>
                <Body size={13}>{humanMuscle(m)}</Body><Mono tone="t3" size={12}>{n}</Mono>
              </View>
            ))}
          </View>
          {prs.length > 0 && (<>
            <Meta style={{ marginTop: 28 }}>Records</Meta>
            {prs.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }}>
                <Body tone="gold">★ {p.name}</Body><Mono tone="t2" size={13}>{p.w ?? 'BW'} × {p.r}</Mono>
              </View>
            ))}
          </>)}
          <Body tone="t3" size={13} style={{ marginTop: 28 }}>Load earned and rating changes arrive with v1.0.</Body>
        </ScrollView>
        <View style={{ padding: 24 }}><Button label="Done" onPress={done} /></View>
      </SafeAreaView>
    </Zone>
  );
}
