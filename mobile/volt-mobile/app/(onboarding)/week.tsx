import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/onboarding/store';
import { toSession, WEEK } from '@/onboarding/templates';
import { newId, useSession } from '@/session/store';
import { Body, Button, Hairline, Heading, Meta, Mono, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function WeekScreen() {
  const router = useRouter(); const o = useOnboarding(); const start = useSession((s) => s.start);
  const week = WEEK[o.goal ?? 'fit']; const total = week.reduce((n, s) => n + s.minutes, 0);
  const today = new Date();
  const dayOf = (d: number) => { const x = new Date(today); x.setDate(today.getDate() + d); return x; };
  const first = week.find((s) => s.kind === 'lift')!;
  const weeksOut = o.eventDate ? Math.max(1, Math.round((Date.parse(o.eventDate) - Date.now()) / (7 * 864e5))) : null;
  const begin = () => {
    start({ id: newId(), title: first.title, exercises: toSession(first), now: new Date().toISOString() });
    router.push('/workout/live');
  };
  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
          <Meta style={{ marginTop: 16 }}>{o.eventName ? `${o.eventName} · ${weeksOut} weeks` : 'Rolling plan'}</Meta>
          <Heading style={{ marginTop: 8 }}>Your first week</Heading>
          <Body tone="t2" size={14} style={{ marginTop: 8 }}>{week.length} sessions, {Math.floor(total / 60)}h {String(total % 60).padStart(2, '0')}m total. Drag, swap or delete any of them.</Body>
        </View>
        <Zone level="raised" style={{ marginTop: 24, paddingVertical: 8 }}>
          {week.map((s, i) => (
            <View key={i}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, gap: 14, alignItems: 'center' }}>
                <View style={{ width: 36 }}><Meta tone="t2">{dayOf(s.day).toLocaleDateString('en-GB', { weekday: 'short' })}</Meta><Meta tone="t3">{String(dayOf(s.day).getDate()).padStart(2, '0')}</Meta></View>
                <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: s.kind === 'lift' ? color.ember : color.jade, borderRadius: 1 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Body size={15}>{s.title}</Body>
                  <Meta tone="t3">{[`${s.minutes} min`, s.lifts ? `${s.lifts.length} lifts` : s.detail].filter(Boolean).join(' · ')}</Meta>
                </View>
                <Mono tone="t4" size={14}>⋮⋮</Mono>
              </View>
              {i < week.length - 1 && <View style={{ marginHorizontal: 24 }}><Hairline /></View>}
            </View>
          ))}
          <View style={{ marginHorizontal: 24 }}><Hairline /></View>
          <Pressable style={{ paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', gap: 14 }}><Mono tone="t3">+</Mono><Body tone="t3" size={14}>Add a session</Body></Pressable>
        </Zone>
        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <Button label={first.day === 0 ? "Start today's session" : `Start ${dayOf(first.day).toLocaleDateString('en-GB', { weekday: 'long' })}'s session`} onPress={begin} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {[0, 1, 2].map((i) => <View key={i} style={{ width: i === 1 ? 20 : 8, height: 3, borderRadius: 2, backgroundColor: i === 1 ? color.t1 : color.t4 }} />)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView></Zone>
  );
}
