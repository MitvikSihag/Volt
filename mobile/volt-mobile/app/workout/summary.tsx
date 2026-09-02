import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkout } from '@/api/queries';
import { formatElapsed, humanMuscle } from '@/session/fromRoutine';
import { loggedCount } from '@/session/reducer';
import { useSession } from '@/session/store';
import { Body, Button, HeaderWash, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function Summary() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>(); const insets = useSafeAreaInsets();
  const { data: w } = useWorkout(id);
  const session = useSession((s) => s.session); const discard = useSession((s) => s.discard);
  const muscles = new Map<string, number>();
  for (const e of session?.exercises ?? []) if (e.logged.length) muscles.set(e.muscle, (muscles.get(e.muscle) ?? 0) + e.logged.length);
  const prs = (w?.exercises ?? []).flatMap((e) => (e.sets ?? []).filter((s) => s.isPr).map((s) => ({ name: e.exerciseName, w: s.weightKg, r: s.reps })));
  const started = w?.startedAt ?? session?.startedAt; const ended = w?.completedAt ?? session?.finish?.completedAt;
  const date = started ? new Date(started).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const done = () => { discard(); router.replace('/(tabs)'); };
  const share = () => void Share.share({ message: [w?.title ?? session?.title, w?.totalVolumeKg != null ? `${Math.round(w.totalVolumeKg).toLocaleString()} kg` : null, session ? `${loggedCount(session)} sets` : null, ended && started ? formatElapsed(Date.parse(ended) - Date.parse(started)) : null].filter(Boolean).join(' · ') });

  return (
    <Zone style={{ flex: 1 }}>
      <HeaderWash tone="ember" />
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Heading size={26} style={{ flex: 1 }}>{w?.title ?? session?.title}</Heading>
            <Pressable onPress={done} hitSlop={12}><Mono tone="t2" size={18}>×</Mono></Pressable>
          </View>
          <Meta style={{ marginTop: 6 }}>{date}{ended ? ` · ${new Date(ended).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</Meta>
          <Numeral style={{ marginTop: 40 }}>{w?.totalVolumeKg == null ? '—' : Math.round(w.totalVolumeKg).toLocaleString()}</Numeral>
          <Body tone="t2">Total volume · kg</Body>
          <View style={{ height: 32 }} /><Hairline />
          <View style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between' }}><Body tone="t2">Duration</Body><Mono>{ended && started ? formatElapsed(Date.parse(ended) - Date.parse(started)) : '—'}</Mono></View>
          <Hairline />
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
              <View key={i} style={{ paddingTop: 12, gap: 3 }}>
                <Body tone="gold">★ {p.name} — {p.r}-rep best</Body>
                <Meta>{p.w ?? 'BW'} kg × {p.r}</Meta>
              </View>
            ))}
          </>)}
        </ScrollView>
        <View style={{ padding: 24, flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Button label="Done" tone="ghost" onPress={done} /></View>
          <View style={{ flex: 1 }}><Button label="Share" onPress={share} /></View>
        </View>
      </View>
    </Zone>
  );
}
