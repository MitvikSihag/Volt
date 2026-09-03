import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLastSets, useRecords } from '@/api/queries';
import { formatElapsed } from '@/session/fromRoutine';
import { isPr, prLabel } from '@/session/pr';
import { clearRest, goToExercise, logSet, prefill, removeLoggedSet, step } from '@/session/reducer';
import { useSession } from '@/session/store';
import { Body, Button, Hairline, Heading, Meta, Mono, Numeral, Stepper, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';
import { useNow } from '@/ui/useNow';

export default function Live() {
  const router = useRouter(); const now = useNow(); const insets = useSafeAreaInsets();
  const session = useSession((s) => s.session); const dispatch = useSession((s) => s.dispatch); const discard = useSession((s) => s.discard);
  const [expanded, setExpanded] = useState(false);
  const ex = session?.exercises[session.currentExercise];
  const ids = session?.exercises.map((e) => e.exerciseId) ?? [];
  const { data: lastSets } = useLastSets(ids);
  const { data: records } = useRecords(ex?.exerciseId);

  useEffect(() => {
    if (!lastSets) return;
    for (const l of lastSets) if (l.exerciseId) dispatch((s) => prefill(s, l.exerciseId!, { weightKg: l.weightKg ?? null, reps: l.reps ?? null }));
  }, [lastSets]);

  const live = session?.status === 'live';
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  useFocusEffect(useCallback(() => { if (!live) leave(); }, [live]));
  if (!session || session.status !== 'live') return null;

  const restLeft = session.restUntil ? Date.parse(session.restUntil) - now : 0;
  const canLog = !!ex && (ex.bodyweight || session.current.weightKg != null) && (session.current.reps ?? 0) > 0;
  const nextEx = session.exercises[session.currentExercise + 1];
  const willPr = !!ex && !!records && isPr(session.current, records);
  const label = records ? prLabel(records) : null;
  const weight = session.current.weightKg;
  const half = weight != null && String(weight).endsWith('.5');

  const onLog = () => dispatch((s) => logSet(s, new Date().toISOString()));
  const swipeDown = Gesture.Pan().runOnJS(true).activeOffsetY(16).onEnd((e) => { if (e.translationY > 80) leave(); });
  const onClose = () => Alert.alert('Session', 'Your sets stay saved on this phone.', [
    { text: 'Finish session', onPress: () => router.push('/workout/finish') },
    { text: 'Minimise', onPress: leave },
    { text: 'Discard session', style: 'destructive', onPress: () => { discard(); leave(); } },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <Zone style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}><View style={{ flex: 1 }}>
      <GestureDetector gesture={swipeDown}><Zone level="raised" style={{ marginTop: -insets.top, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Mono tone="t2" size={13}>● {formatElapsed(now - Date.parse(session.startedAt))}</Mono>
      </View>
      <View style={{ paddingHorizontal: 24, paddingTop: 14, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Body tone="t2">{session.title}</Body>
          <Meta>Exercise {session.currentExercise + 1} / {session.exercises.length || 1}</Meta>
        </View>
        <Pressable onPress={onClose} hitSlop={12}><Mono tone="t2" size={18}>×</Mono></Pressable>
      </View>
      <View style={{ height: 2, backgroundColor: color.ember, marginTop: 16 }} />
      </Zone></GestureDetector>

      {!ex ? (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
          <Heading>Empty session.</Heading>
          <Body tone="t2">Add your first exercise to start logging.</Body>
          <Button label="Add exercise" onPress={() => router.push('/workout/picker')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 6 }}>
            <Pressable onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.exerciseId } })}><Heading size={26}>{ex.name}</Heading></Pressable>
            <Meta>Set {ex.logged.length + 1} of {Math.max(ex.planned.length, ex.logged.length + 1)}{label ? ` · ${label}` : ''}</Meta>
          </View>
          <View style={{ paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
            {!ex.bodyweight && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Numeral size={88}>{weight == null ? '—' : String(Math.floor(weight))}</Numeral>
                {half && <Numeral size={40} tone="t2" style={{ marginBottom: 8 }}>.5</Numeral>}
                <Mono tone="t2" size={13} style={{ marginBottom: 16, marginLeft: 6 }}>kg</Mono>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginLeft: 'auto' }}>
              <Numeral size={44}>{session.current.reps ?? '—'}</Numeral>
              <Mono tone="t2" size={13} style={{ marginBottom: 8, marginLeft: 6 }}>reps</Mono>
            </View>
          </View>
          {willPr && <Meta tone="gold" style={{ paddingHorizontal: 24, paddingTop: 8 }}>New record if you log this</Meta>}
          <View style={{ paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row', gap: 12 }}>
            {!ex.bodyweight && <Stepper label="2.5 kg" onMinus={() => dispatch((s) => step(s, 'weightKg', -2.5))} onPlus={() => dispatch((s) => step(s, 'weightKg', 2.5))} />}
            <Stepper label="rep" onMinus={() => dispatch((s) => step(s, 'reps', -1))} onPlus={() => dispatch((s) => step(s, 'reps', 1))} />
          </View>

          <Zone level="raised" style={{ flex: 1, marginTop: 24, paddingHorizontal: 24, paddingVertical: 16 }}>
            <Pressable onPress={() => setExpanded((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Body tone="t2" size={13}>{ex.logged.length} set{ex.logged.length === 1 ? '' : 's'} logged</Body>
              <Mono tone="t3" size={13}>{expanded ? '⌃' : '⌄'}</Mono>
            </Pressable>
            {expanded && ex.logged.map((l, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 }}>
                <Mono tone="t2" size={13}>{String(i + 1).padStart(2, '0')}  {l.weightKg ?? 'BW'} × {l.reps}</Mono>
                <Pressable onPress={() => dispatch((s) => removeLoggedSet(s, s.currentExercise, i))} hitSlop={8}><Meta>Remove</Meta></Pressable>
              </View>
            ))}
            <View style={{ height: 12 }} /><Hairline />
            {ex.planned.slice(ex.logged.length).map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }}>
                <Mono tone={i === 0 ? 't1' : 't4'} size={13}>{String(ex.logged.length + i + 1).padStart(2, '0')}  {p.weightKg ?? (ex.bodyweight ? 'BW' : '—')} × {p.reps ?? '—'}</Mono>
                <Meta tone={i === 0 ? 'ember' : 't4'}>{i === 0 ? 'Now' : '—'}</Meta>
              </View>
            ))}
            <Pressable onPress={() => (nextEx ? dispatch((s) => goToExercise(s, s.currentExercise + 1)) : router.push('/workout/picker'))} style={{ marginTop: 16, borderLeftWidth: 2, borderLeftColor: color.jade, paddingLeft: 12 }}>
              <Body tone="t2" size={13}>{nextEx ? `Next up — ${nextEx.name}` : 'Add another exercise'}</Body>
            </Pressable>
            {session.currentExercise > 0 && <Pressable onPress={() => dispatch((s) => goToExercise(s, s.currentExercise - 1))} style={{ marginTop: 10 }}><Meta>← Previous exercise</Meta></Pressable>}
          </Zone>
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: 24, paddingBottom: 8, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Meta>Rest</Meta>
          <Pressable onPress={() => dispatch(clearRest)} hitSlop={8}><Mono tone={restLeft > 0 ? 't1' : 't3'} size={13}>{restLeft > 0 ? formatElapsed(restLeft) : '—'}</Mono></Pressable>
        </View>
        {ex && <Button label="Log set" onPress={onLog} disabled={!canLog} />}
        <Meta tone="t3" style={{ textAlign: 'center' }}>Swipe down to minimise</Meta>
      </View>
    </View></Zone>
  );
}
