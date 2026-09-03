import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboard, useExercises, useLastSets, useMe, useRoutines } from '@/api/queries';
import { fromRoutine } from '@/session/fromRoutine';
import { useOnboarding } from '@/onboarding/store';
import { toSession, WEEK } from '@/onboarding/templates';
import { useRun } from '@/run/store';
import { newId, useSession } from '@/session/store';
import { Body, Button, HeaderWash, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const sum = (xs: { volumeKg?: number }[]) => xs.reduce((n, d) => n + (d.volumeKg ?? 0), 0);

export default function Today() {
  const router = useRouter();
  const { data: me } = useMe(); const { data: dash } = useDashboard();
  const { data: routines } = useRoutines(); const { data: exercises } = useExercises();
  const session = useSession((s) => s.session); const start = useSession((s) => s.start); const discard = useSession((s) => s.discard);
  const routine = routines?.[0]; const runStatus = useRun((r) => r.status);
  const ob = useOnboarding();
  // No routines yet → preview the next lift from the seeded week (day 0 = the day the goal was chosen)
  const plan = ob.goal ? WEEK[ob.goal] : [];
  const dayIdx = ob.startedAt ? Math.floor((Date.now() - Date.parse(ob.startedAt)) / 864e5) % 7 : 0;
  const seeded = !routines?.length && plan.length ? (plan.find((s) => s.kind === 'lift' && s.day >= dayIdx) ?? plan.find((s) => s.kind === 'lift')) : undefined;
  const raceLine = ob.eventName && ob.eventDate ? [ob.eventName, `${Math.max(0, Math.ceil((Date.parse(ob.eventDate) - Date.now()) / 864e5))} days`, ob.startedAt ? `WK ${Math.floor((Date.now() - Date.parse(ob.startedAt)) / (7 * 864e5)) + 1}` : null].filter(Boolean).join(' / ') : null;
  const routineIds = (routine?.exercises ?? []).map((e) => e.exerciseId ?? '').filter(Boolean);
  const { data: lastSets } = useLastSets(routineIds);
  const lastById = new Map((lastSets ?? []).map((l) => [l.exerciseId, l]));
  const byId = new Map((exercises ?? []).map((e) => [e.id ?? '', e]));
  const initials = (me?.displayName ?? me?.username ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const days = dash?.chartData ?? [];
  const week = days.slice(-7); const prior = days.slice(-14, -7);
  const volume = dash?.week?.volumeKg;
  const delta = prior.length && sum(prior) > 0 ? Math.round(((sum(week) - sum(prior)) / sum(prior)) * 100) : null;
  const max = Math.max(1, ...week.map((d) => d.volumeKg ?? 0));
  const now = new Date();
  const dateLine = [now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), dash?.week ? `${dash.week.workouts ?? 0} sessions` : null, dash?.week ? `${dash.week.activeDays ?? 0} active days` : null].filter(Boolean).join(' / ');

  const begin = (adhoc: boolean) => {
    if (session?.status === 'live') return router.push('/workout/live');
    const planned = !adhoc && routine;
    if (!adhoc && !routine && seeded) { start({ id: newId(), title: seeded.title, exercises: toSession(seeded), now: now.toISOString() }); return router.push('/workout/live'); }
    start({ id: newId(), title: planned ? routine.name ?? 'Session' : 'Ad-hoc session', routineId: planned ? routine.id : undefined, exercises: planned ? fromRoutine(routine, byId) : [], now: now.toISOString() });
    router.push('/workout/live');
  };
  const setLine = (e: NonNullable<typeof routine>['exercises'] extends (infer T)[] | undefined ? T : never) => {
    const last = lastById.get(e.exerciseId);
    return [`${e.targetSets ?? '–'}×${e.targetReps ?? '–'}`, last?.weightKg != null ? String(last.weightKg) : null].filter(Boolean).join(' · ');
  };

  return (
    <Zone style={{ flex: 1 }}>
      <HeaderWash tone="ember" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 28, flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Heading>{DAY[now.getDay()]}.</Heading>
              <Heading tone="t2">{routine?.name ? `${routine.name}.` : seeded ? `${seeded.title}.` : 'No plan today.'}</Heading>
            </View>
            <Pressable onPress={() => router.push('/profile')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}><Mono size={12}>{initials}</Mono></Pressable>
          </View>
          <Meta style={{ paddingHorizontal: 24, paddingTop: 16 }}>{raceLine ?? dateLine}</Meta>

          <View style={{ paddingHorizontal: 24, paddingTop: 36, flexDirection: 'row', alignItems: 'flex-end' }}>
            <View style={{ flexShrink: 1 }}><Numeral numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{volume == null ? '—' : Math.round(volume).toLocaleString()}</Numeral></View>
            {delta != null && <Mono tone="t1" size={15} style={{ marginLeft: 10, marginBottom: 14 }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</Mono>}
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 16, flexShrink: 0, marginLeft: 12 }}>
              {week.map((d, i) => (
                <View key={i} style={{ width: 6, height: 4 + Math.round(28 * ((d.volumeKg ?? 0) / max)), backgroundColor: i === week.length - 1 ? color.t1 : color.t4, borderRadius: 1 }} />
              ))}
            </View>
          </View>
          <Body tone="t2" style={{ paddingHorizontal: 24, marginTop: 4 }}>Volume, last seven days · kg</Body>
          <View style={{ height: 28 }} />
          <Hairline />

          <Zone level="raised" style={{ padding: 24, gap: 4 }}>
            <Meta tone="ember">● Session 1{routine?.exercises?.length ? ` · ${routine.exercises.length} lifts` : seeded ? ` · ${seeded.minutes} min · ${seeded.lifts?.length ?? 0} lifts` : ''}</Meta>
            <Heading size={24} style={{ marginTop: 8, marginBottom: 8 }}>{routine?.name ?? seeded?.title ?? 'Ad-hoc session'}</Heading>
            {!routine && seeded && (seeded.lifts ?? []).slice(0, 3).map((l) => (
              <View key={l.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                <Body>{l.name}</Body>
                <Mono tone="t2" size={13}>{l.sets}×{l.reps}</Mono>
              </View>
            ))}
            {!routine && seeded && (seeded.lifts?.length ?? 0) > 3 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                <Body tone="t2" size={13}>+ {(seeded.lifts?.length ?? 0) - 3} more · from your first week</Body>
                <Mono tone="t3" size={13}>›</Mono>
              </View>
            )}
            {(routine?.exercises ?? []).slice(0, 3).map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                <Body>{e.exerciseName}</Body>
                <Mono tone="t2" size={13}>{setLine(e)}</Mono>
              </View>
            ))}
            {(routine?.exercises?.length ?? 0) > 3 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                <Body tone="t2" size={13}>+ {routine!.exercises!.length - 3} more · tap for detail</Body>
                <Mono tone="t3" size={13}>›</Mono>
              </View>
            )}
            {!routine && !seeded && <Body tone="t2" size={13}>No routines yet. Start logs an empty session; long-press always does.</Body>}
            <Pressable onPress={() => router.push('/run/live')} style={{ marginTop: 10, borderLeftWidth: 2, borderLeftColor: color.jade, paddingLeft: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Body tone="t2" size={13}>{runStatus === 'idle' ? 'Record a run' : 'Run in progress'}</Body><Mono tone="t3" size={13}>›</Mono>
            </Pressable>
            {session?.status === 'unsaved' && (
              <Pressable onPress={() => router.push('/workout/finish')} style={{ marginTop: 8, borderLeftWidth: 2, borderLeftColor: color.ember, paddingLeft: 12 }}>
                <Body tone="t2" size={13}>Unsaved session — tap to retry</Body>
              </Pressable>
            )}
            <View style={{ height: 20 }} />
            <Button label={session?.status === 'live' ? 'Resume session' : 'Start session'} onPress={() => begin(false)} onLongPress={() => begin(true)} delayLongPress={400} />
            {session?.status === 'saved' && <Pressable onPress={discard}><Body tone="t3" size={12} style={{ textAlign: 'center', marginTop: 12 }}>Clear last session</Body></Pressable>}
          </Zone>
        </ScrollView>
      </SafeAreaView>
    </Zone>
  );
}
