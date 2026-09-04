import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExercise, useExerciseHistory, useProgression, useRecords } from '@/api/queries';
import { humanMuscle, toInput } from '@/session/fromRoutine';
import { addExercise } from '@/session/reducer';
import { newId, useSession } from '@/session/store';
import { LineChart } from '@/ui/LineChart';
import { Body, Button, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';
import { useUnits } from '@/settings/units';

const TABS = ['About', 'History', 'Charts', 'Records'] as const;
const SERIES = [{ k: 'estimatedOneRepMax', l: 'E1RM' }, { k: 'bestWeightKg', l: 'Heaviest set' }, { k: 'volumeKg', l: 'Volume' }] as const;
const CLUBS = [40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 250, 300];
const REC_LABEL: Record<string, string> = { ONE_REP_MAX: 'e1RM', MAX_WEIGHT: 'Heaviest', MAX_VOLUME: 'Volume', MAX_REPS_AT_WEIGHT: 'Reps' };

export default function ExerciseDetail() {
  const router = useRouter(); const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { width } = useWindowDimensions(); const insets = useSafeAreaInsets(); const units = useUnits();
  const { data: ex } = useExercise(id); const { data: records } = useRecords(id); const { data: prog } = useProgression(id); const { data: hist } = useExerciseHistory(id);
  const [active, setActive] = useState<(typeof TABS)[number]>((TABS as readonly string[]).includes(tab ?? '') ? (tab as (typeof TABS)[number]) : 'Charts');
  const [series, setSeries] = useState<(typeof SERIES)[number]['k']>('estimatedOneRepMax');
  const session = useSession((s) => s.session); const dispatch = useSession((s) => s.dispatch); const start = useSession((s) => s.start);

  const e1rm = records?.find((r) => r.type === 'ONE_REP_MAX')?.value;
  const heaviest = records?.find((r) => r.type === 'MAX_WEIGHT')?.value;
  const pts = (prog ?? []).filter((p) => p[series] != null).map((p) => ({ date: p.date ?? '', value: p[series] as number }));
  const first = pts[0], last = pts[pts.length - 1];
  const months = first && last ? Math.max(1, Math.round((Date.parse(last.date) - Date.parse(first.date)) / (30 * 864e5))) : 0;
  const perMonth = first && last && months ? (last.value - first.value) / months : null;
  const nextClub = heaviest != null ? CLUBS.find((c) => c > heaviest) : undefined;
  const sessions = new Set((hist ?? []).map((s) => (s.completedAt ?? '').slice(0, 10))).size;
  const totalVolume = (hist ?? []).reduce((n, s) => n + (s.weightKg ?? 0) * (s.reps ?? 0), 0);

  const addToSession = () => {
    if (!ex) return;
    if (session?.status === 'live') dispatch((s) => addExercise(s, toInput(ex)));
    else start({ id: newId(), title: 'Ad-hoc session', exercises: [toInput(ex)], now: new Date().toISOString() });
    router.push('/workout/live');
  };

  return (
    <Zone style={{ flex: 1, paddingTop: insets.top }}><View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
          <Mono tone="t3" size={18}>···</Mono>
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 10 }}>
          <Heading size={26}>{ex?.name ?? '—'}</Heading>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[ex?.primaryMuscleGroup, ...(ex?.secondaryMuscleGroups ?? [])].filter(Boolean).map((m, i) => (
              <View key={String(m)} style={{ paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: color.raised, justifyContent: 'center' }}><Body size={12} tone={i === 0 ? 't1' : 't2'}>{humanMuscle(String(m))}</Body></View>
            ))}
          </View>
          <Meta tone="t3">{[ex?.equipment, ex?.movementType, ex?.equipment === 'BODYWEIGHT' ? 'reps' : 'weight × reps'].filter(Boolean).join('  ·  ')}</Meta>
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 24, flexDirection: 'row', alignItems: 'flex-end' }}>
          <Numeral size={56}>{e1rm != null ? units.fmt(Math.round(e1rm * 2) / 2) : '—'}</Numeral>
          <Mono tone="t2" size={13} style={{ marginLeft: 6, marginBottom: 10 }}>{units.unit}</Mono>
        </View>
        <Body tone="t2" size={13} style={{ paddingHorizontal: 24 }}>Estimated 1-rep max</Body>

        <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 24, gap: 20 }}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setActive(t)} style={{ paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: t === active ? color.t1 : 'transparent' }}>
              <Body size={14} tone={t === active ? 't1' : 't3'}>{t}</Body>
            </Pressable>
          ))}
        </View>
        <Hairline />

        {active === 'Charts' && (
          <Zone level="raised" style={{ paddingVertical: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24 }}>
              {SERIES.map((s) => (
                <Pressable key={s.k} onPress={() => setSeries(s.k)} style={{ paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: s.k === series ? color.base : 'transparent' }}>
                  <Meta tone={s.k === series ? 't1' : 't3'}>{s.l}</Meta>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 20 }}>
              <Body size={15}>{SERIES.find((s) => s.k === series)?.l} trend</Body>
              {perMonth != null && months > 0 && <Meta tone="t2">{perMonth >= 0 ? '+' : '−'}{Math.abs(Math.round(last.value - first.value))} kg · {months} mo</Meta>}
            </View>
            <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
              {pts.length > 0 ? <LineChart points={pts} width={width - 48} unit="" /> : <Body tone="t3" size={13}>Log this exercise twice to see a trend.</Body>}
            </View>
            <Hairline />
            <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16 }}>
              {[{ v: heaviest, l: 'Heaviest · kg' }, { v: Math.round(totalVolume), l: 'Volume · kg' }, { v: sessions, l: 'Sessions' }].map((s) => (
                <View key={s.l} style={{ flex: 1 }}><Mono size={17}>{s.v != null ? s.v.toLocaleString() : '—'}</Mono><Meta tone="t3" style={{ marginTop: 4 }}>{s.l}</Meta></View>
              ))}
            </View>
            {perMonth != null && months > 0 && nextClub != null && perMonth > 0 && (
              <View style={{ marginHorizontal: 24, marginTop: 20, borderLeftWidth: 2, borderLeftColor: color.ember, paddingLeft: 12 }}>
                <Body tone="t2" size={13}>Gaining {Math.round(perMonth * 10) / 10} kg a month. On pace for the {nextClub} kg club in {Math.max(1, Math.ceil((nextClub - (heaviest ?? 0)) / perMonth))} months.</Body>
              </View>
            )}
          </Zone>
        )}

        {active === 'Records' && (
          <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
            {nextClub != null && heaviest != null && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body size={15}>{nextClub} kg Club</Body><Mono size={13}>{Math.round((heaviest / nextClub) * 100)}<Mono tone="t3" size={11}>%</Mono></Mono></View>
                <View style={{ height: 4, backgroundColor: color.raised, borderRadius: 2 }}><View style={{ width: `${Math.min(100, (heaviest / nextClub) * 100)}%`, height: 4, backgroundColor: color.gold, borderRadius: 2 }} /></View>
                <Body tone="t2" size={13}>{Math.round((nextClub - heaviest) * 2) / 2} kg to go on your best single</Body>
              </View>
            )}
            <Meta tone="t3" style={{ paddingTop: 28 }}>Personal records</Meta>
            {(records ?? []).map((r, i) => (
              <View key={i}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
                  <Meta tone="t3" style={{ width: 72 }}>{REC_LABEL[r.type ?? ''] ?? r.type}</Meta>
                  <Mono tone="gold" size={15}>{r.value != null ? (Math.round(r.value * 2) / 2).toLocaleString() : '—'}</Mono>
                  <Mono tone="t3" size={11} style={{ marginLeft: 6, flex: 1 }}>{r.type === 'MAX_REPS_AT_WEIGHT' ? `at ${r.contextWeightKg ?? '—'} kg` : 'kg'}</Mono>
                  <Meta tone="t3">{r.achievedAt ? new Date(r.achievedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</Meta>
                </View>
                <Hairline />
              </View>
            ))}
            {(records ?? []).length === 0 && <Body tone="t3" size={13} style={{ paddingTop: 12 }}>No records yet. Every first set counts.</Body>}
          </View>
        )}

        {active === 'History' && (
          <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
            {(hist ?? []).map((s, i) => (
              <View key={s.id ?? i}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
                  <Meta tone="t2">{s.completedAt ? new Date(s.completedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</Meta>
                  <Mono size={14}>{s.weightKg ?? 'BW'} × {s.reps}{s.isPr ? <Mono tone="gold" size={12}>  ★</Mono> : null}</Mono>
                </View>
                <Hairline />
              </View>
            ))}
            {(hist ?? []).length === 0 && <Body tone="t3" size={13} style={{ paddingTop: 12 }}>No sets logged yet.</Body>}
          </View>
        )}

        {active === 'About' && (
          <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 12 }}>
            <Body tone="t2">{ex?.description || 'No notes for this exercise yet.'}</Body>
            <Meta tone="t3">{ex?.system ? 'Volt library' : 'Your exercise'}</Meta>
          </View>
        )}
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 0, paddingBottom: insets.bottom + 8 }}><Button label="Add to today's session" onPress={addToSession} disabled={!ex} /></View>
    </View></Zone>
  );
}
