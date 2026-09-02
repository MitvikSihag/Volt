import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboard, useExercises, useMe, useRoutines } from '@/api/queries';
import { fromRoutine } from '@/session/fromRoutine';
import { newId, useSession } from '@/session/store';
import { Body, Button, HeaderWash, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Today() {
  const router = useRouter();
  const { data: me } = useMe(); const { data: dash } = useDashboard();
  const { data: routines } = useRoutines(); const { data: exercises } = useExercises();
  const session = useSession((s) => s.session); const start = useSession((s) => s.start); const discard = useSession((s) => s.discard);
  const routine = routines?.[0];
  const byId = new Map((exercises ?? []).map((e) => [e.id ?? '', e]));
  const initials = (me?.displayName ?? me?.username ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const volume = dash?.week?.volumeKg;

  const begin = (adhoc: boolean) => {
    if (session?.status === 'live') return router.push('/workout/live');
    const planned = !adhoc && routine;
    start({ id: newId(), title: planned ? routine.name ?? 'Session' : 'Ad-hoc session', routineId: planned ? routine.id : undefined, exercises: planned ? fromRoutine(routine, byId) : [], now: new Date().toISOString() });
    router.push('/workout/live');
  };

  return (
    <Zone style={{ flex: 1 }}>
      <HeaderWash tone="ember" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Meta tone="t3">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Meta>
            <Pressable onPress={() => router.push('/profile')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}><Mono size={12}>{initials}</Mono></Pressable>
          </View>
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <Heading>{DAY[new Date().getDay()]}.</Heading>
            <Heading tone="t2">{routine?.name ? `${routine.name}.` : 'No plan today.'}</Heading>
          </View>
          <View style={{ paddingHorizontal: 24, paddingTop: 40 }}>
            <Numeral>{volume == null ? '—' : Math.round(volume).toLocaleString()}</Numeral>
            <Body tone="t2" style={{ marginTop: 4 }}>Volume, last seven days · kg</Body>
          </View>
          <View style={{ height: 32 }} />
          <Hairline />
          <Zone level="raised" style={{ padding: 24, gap: 6 }}>
            <Meta>● Session 1{routine?.exercises?.length ? ` · ${routine.exercises.length} lifts` : ''}</Meta>
            <Heading size={24} style={{ marginTop: 6 }}>{routine?.name ?? 'Ad-hoc session'}</Heading>
            {(routine?.exercises ?? []).slice(0, 3).map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{e.exerciseName}</Body>
                <Mono tone="t2" size={13}>{e.targetSets ?? '–'}×{e.targetReps ?? '–'}</Mono>
              </View>
            ))}
            {(routine?.exercises?.length ?? 0) > 3 && <Body tone="t2" size={13}>+ {routine!.exercises!.length - 3} more</Body>}
            {!routine && <Body tone="t3" size={13}>No routines yet. Start logs an empty session; long-press always does.</Body>}
            {session?.status === 'unsaved' && (
              <Pressable onPress={() => router.push('/workout/finish')} style={{ marginTop: 8, borderLeftWidth: 2, borderLeftColor: color.ember, paddingLeft: 12 }}>
                <Body tone="t2" size={13}>Unsaved session — tap to retry</Body>
              </Pressable>
            )}
            <View style={{ height: 16 }} />
            <Button label={session?.status === 'live' ? 'Resume session' : 'Start session'} onPress={() => begin(false)} onLongPress={() => begin(true)} delayLongPress={400} />
            {session?.status === 'saved' && <Pressable onPress={discard}><Body tone="t3" size={12} style={{ textAlign: 'center', marginTop: 12 }}>Clear last session</Body></Pressable>}
          </Zone>
        </ScrollView>
      </SafeAreaView>
    </Zone>
  );
}
