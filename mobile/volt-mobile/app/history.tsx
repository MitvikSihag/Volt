import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivities, useWorkouts } from '@/api/queries';
import { formatElapsed } from '@/session/fromRoutine';
import { Body, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

type Row = { id: string; kind: 'lift' | 'cardio'; title: string; at: string; meta: string; value: string; unit: string };
const FILTERS = ['All', 'Lifts', 'Cardio'] as const;

function weekLabel(iso: string, now: Date) {
  const d = new Date(iso); const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
  if (d >= monday) return 'This week';
  const start = new Date(d); start.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const end = new Date(start); end.setDate(start.getDate() + 6);
  const f = (x: Date) => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${f(start)} – ${f(end)}`;
}

export default function History() {
  const router = useRouter(); const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const { data: workouts } = useWorkouts(); const { data: activities } = useActivities();
  const rows: Row[] = [
    ...(workouts?.content ?? []).map((w): Row => ({
      id: w.id ?? '', kind: 'lift', title: w.title ?? 'Session', at: w.startedAt ?? '',
      meta: [new Date(w.startedAt ?? '').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), w.completedAt && w.startedAt ? `${Math.round((Date.parse(w.completedAt) - Date.parse(w.startedAt)) / 60000)} min` : null, w.exercises?.length ? `${w.exercises.length} exercise${w.exercises.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · '),
      value: w.totalVolumeKg != null ? Math.round(w.totalVolumeKg).toLocaleString() : '—', unit: 'kg',
    })),
    ...(activities?.content ?? []).map((a): Row => ({
      id: a.id ?? '', kind: 'cardio', title: a.title ?? (a.type ?? 'Run').toLowerCase(), at: a.startedAt ?? '',
      meta: [new Date(a.startedAt ?? '').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), a.distanceMeters != null ? `${(a.distanceMeters / 1000).toFixed(1)} km` : null, a.durationSeconds != null ? formatElapsed(a.durationSeconds * 1000) : null].filter(Boolean).join(' · '),
      value: a.distanceMeters != null ? (a.distanceMeters / 1000).toFixed(1) : '—', unit: 'km',
    })),
  ].filter((r) => filter === 'All' || (filter === 'Lifts' ? r.kind === 'lift' : r.kind === 'cardio')).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const now = new Date(); const total = (workouts?.totalElements ?? 0) + (activities?.totalElements ?? 0);
  let lastGroup = '';

  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 12 }}>
            <Heading>History</Heading>
            <Meta>{total} sessions</Meta>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 16 }}>
            {FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal: 14, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: f === filter ? color.t1 : color.raised }}>
                <Body size={13} style={f === filter ? { color: color.sunken } : undefined} tone={f === filter ? 't1' : 't2'}>{f}</Body>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ paddingTop: 12 }}>
          {rows.map((r) => {
            const g = weekLabel(r.at, now); const header = g !== lastGroup; lastGroup = g;
            return (
              <View key={r.kind + r.id}>
                {header && <Zone level="raised" style={{ paddingHorizontal: 24, paddingVertical: 8, marginTop: 8 }}><Meta tone="t3">{g}</Meta></Zone>}
                <Pressable onPress={() => r.kind === 'lift' ? router.push({ pathname: '/workout/summary', params: { id: r.id, readonly: '1' } }) : undefined} style={{ flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, gap: 14 }}>
                  <View style={{ width: 2, backgroundColor: r.kind === 'lift' ? color.ember : color.jade, borderRadius: 1 }} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Body size={15}>{r.title}</Body>
                    <Meta tone="t2">{r.meta}</Meta>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Numeral size={18}>{r.value}</Numeral>
                    <Meta tone="t3">{r.unit}</Meta>
                  </View>
                </Pressable>
                <Hairline />
              </View>
            );
          })}
          {rows.length === 0 && <Body tone="t3" style={{ padding: 24 }}>Nothing logged yet. Your first session shows up here.</Body>}
        </View>
      </ScrollView>
    </SafeAreaView></Zone>
  );
}
