import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Alert, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatElapsed } from '@/session/fromRoutine';
import { currentPace, formatPace, paceSecPerKm, splits, totalDistance } from '@/run/geo';
import { activeMs, useRun } from '@/run/store';
import { startTracking, stopTracking } from '@/run/tracker';
import { Body, Button, Hairline, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { RouteArt } from '@/ui/RouteArt';
import { color } from '@/ui/tokens';
import { useNow } from '@/ui/useNow';

export default function LiveRun() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const now = useNow(); const { width } = useWindowDimensions();
  const run = useRun();
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  useEffect(() => {
    if (run.status !== 'idle') return;
    run.start();
    startTracking().catch((e) => { Alert.alert('Can\'t record', e instanceof Error ? e.message : 'Location unavailable'); run.reset(); leave(); });
  }, []);

  const distance = totalDistance(run.points);
  const elapsed = activeMs(run.segments, now);
  const avg = paceSecPerKm(distance, elapsed);
  const cur = run.status === 'recording' ? currentPace(run.points, now) : null;
  const shown = cur ?? avg;
  const delta = cur != null && avg != null && distance > 200 ? Math.round(avg - cur) : null;
  const km = splits(run.points);
  const fastest = Math.min(...km.filter((s) => s.complete).map((s) => s.pace), Infinity);

  const finish = useCallback(async () => {
    await stopTracking();
    router.push('/run/save');
  }, [router]);
  const onLap = () => run.lap(distance);
  const onPause = () => { run.pause(); };
  const onResume = () => { run.resume(); };
  const discard = () => Alert.alert('Discard run?', 'The route on this phone will be deleted.', [{ text: 'Keep', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: async () => { await stopTracking(); run.reset(); leave(); } }]);

  return (
    <Zone level="hero" style={{ flex: 1, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Mono tone="jade" size={12}>● {run.gps === 'locked' ? 'GPS LOCKED' : 'GPS SEARCHING'}</Mono>
        <Pressable onPress={discard} hitSlop={12}><Mono tone="t2" size={18}>×</Mono></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <RouteArt points={run.points} width={width} height={200} />
        <View style={{ paddingHorizontal: 24, marginTop: -8 }}>
          <Meta>Free run · km {km.filter((s) => s.complete).length + 1}</Meta>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
            <Numeral size={92}>{formatPace(shown)}</Numeral>
            <Mono tone="t2" size={15} style={{ marginLeft: 8, marginBottom: 18 }}>/km</Mono>
          </View>
          <Body tone="jade" size={15}>{delta == null ? (run.status === 'paused' ? 'Paused' : 'Finding your pace') : delta === 0 ? 'On your average' : `${Math.abs(delta)} second${Math.abs(delta) === 1 ? '' : 's'} ${delta > 0 ? 'under' : 'over'} your average`}</Body>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 28 }}>
          {[{ v: (distance / 1000).toFixed(2), l: 'km' }, { v: formatElapsed(elapsed), l: 'Elapsed' }, { v: formatPace(avg), l: 'Avg /km' }].map((s) => (
            <View key={s.l} style={{ flex: 1 }}><Numeral size={26}>{s.v}</Numeral><Meta tone="t3" style={{ marginTop: 4 }}>{s.l}</Meta></View>
          ))}
        </View>
        <Zone level="raised" style={{ flex: 1, marginTop: 24, paddingHorizontal: 24, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Body size={15}>Splits</Body>
            <Meta tone="t3">Per km</Meta>
          </View>
          {km.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, gap: 12 }}>
              <Meta tone={s.complete ? 't3' : 'jade'} style={{ width: 24 }}>{String(i + 1).padStart(2, '0')}</Meta>
              <View style={{ flex: 1, height: 3, backgroundColor: color.hairline, borderRadius: 2 }}>
                <View style={{ width: `${isFinite(fastest) ? Math.min(100, (fastest / s.pace) * 100) : 30}%`, height: 3, backgroundColor: s.complete ? color.t3 : color.jade, borderRadius: 2 }} />
              </View>
              <Mono tone={s.complete ? 't2' : 't1'} size={13}>{formatPace(s.pace)}</Mono>
            </View>
          ))}
          {km.length === 0 && <Body tone="t3" size={13} style={{ paddingTop: 12 }}>First split appears after 20 m.</Body>}
        </Zone>
      </ScrollView>
      <Hairline />
      <View style={{ padding: 24, paddingBottom: insets.bottom + 8, flexDirection: 'row', gap: 12 }}>
        {run.status === 'paused' ? (<>
          <View style={{ flex: 1 }}><Button label="Finish" tone="ghost" onPress={finish} /></View>
          <View style={{ flex: 1 }}><Button label="Resume" onPress={onResume} /></View>
        </>) : (<>
          <View style={{ flex: 1 }}><Button label="Pause" tone="ghost" onPress={onPause} /></View>
          <View style={{ flex: 1 }}><Button label="Lap" onPress={onLap} /></View>
        </>)}
      </View>
    </Zone>
  );
}
