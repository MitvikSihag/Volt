import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivities, useMe, useStats, useWorkouts } from '@/api/queries';
import { useAuth } from '@/auth/store';
import { Body, HeaderWash, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

const dayKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function Profile() {
  const router = useRouter();
  const { data: me } = useMe(); const { data: stats } = useStats();
  const { data: workouts } = useWorkouts(); const { data: activities } = useActivities();
  const initials = (me?.displayName ?? me?.username ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const year = me?.joinedAt ? Math.max(1, Math.floor((Date.now() - Date.parse(me.joinedAt)) / (365 * 864e5)) + 1) : null;
  const lifts = new Set((workouts?.content ?? []).map((w) => dayKey(w.startedAt ?? '')));
  const runs = new Set((activities?.content ?? []).map((a) => dayKey(a.startedAt ?? '')));

  // Calendar for the current month, Monday first (artboard 06)
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1); const lead = (first.getDay() + 6) % 7; const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const key = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <Zone style={{ flex: 1 }}>
      <HeaderWash tone="ember" height={220} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
            <Pressable onPress={() => useAuth.getState().logout()} hitSlop={12}><Meta tone="t2">Log out</Meta></Pressable>
          </View>
          <View style={{ paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}><Mono size={16}>{initials}</Mono></View>
            <View style={{ gap: 4 }}>
              <Heading size={22}>{me?.displayName ?? me?.username ?? '—'}</Heading>
              <Meta>{[stats?.totalWorkouts != null ? `${stats.totalWorkouts} sessions` : null, year ? `YR ${year}` : null].filter(Boolean).join(' · ')}</Meta>
            </View>
          </View>

          <View style={{ height: 28 }} /><Hairline />
          <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Heading size={17}>{now.toLocaleDateString('en-GB', { month: 'long' })}</Heading>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Meta><Mono tone="ember" size={11}>●</Mono> Strength</Meta>
                <Meta><Mono tone="jade" size={11}>●</Mono> Cardio</Meta>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Meta key={i} tone="t3" style={{ width: `${100 / 7}%`, textAlign: 'center' }}>{d}</Meta>)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((d, i) => {
                const k = d ? key(d) : ''; const future = d != null && d > now.getDate(); const today = d === now.getDate();
                return (
                  <View key={i} style={{ width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    {d && (
                      <View style={{ alignItems: 'center', width: 26, height: 26, borderRadius: 13, borderWidth: today ? 1 : 0, borderColor: color.ember, justifyContent: 'center' }}>
                        <Mono tone={future ? 't4' : 't1'} size={12}>{d}</Mono>
                        <View style={{ flexDirection: 'row', gap: 2, position: 'absolute', bottom: -6 }}>
                          {lifts.has(k) && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color.ember }} />}
                          {runs.has(k) && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color.jade }} />}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row' }}>
            {[
              { v: stats?.totalWorkouts, l: 'Sessions', u: '' },
              { v: stats?.totalActivities, l: 'Runs', u: '' },
              { v: stats?.totalDistanceMeters != null ? Math.round(stats.totalDistanceMeters / 1000) : undefined, l: 'Distance', u: 'km' },
              { v: stats?.totalVolumeKg != null ? Math.round(stats.totalVolumeKg / 1000) : undefined, l: 'Lifted', u: 't' },
            ].map((s) => (
              <View key={s.l} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                  <Numeral size={22}>{s.v ?? '—'}</Numeral>
                  {s.u ? <Mono tone="t3" size={11} style={{ marginBottom: 4 }}>{s.u}</Mono> : null}
                </View>
                <Meta tone="t3">{s.l}</Meta>
              </View>
            ))}
          </View>

          <View style={{ height: 24 }} /><Hairline />
          {[{ label: 'History', to: '/history' as const, meta: stats?.totalWorkouts != null ? `${(stats.totalWorkouts ?? 0) + (stats.totalActivities ?? 0)} sessions` : '' }].map((r) => (
            <Pressable key={r.label} onPress={() => router.push(r.to)} style={{ paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Body size={16}>{r.label}</Body>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Meta>{r.meta}</Meta><Mono tone="t3" size={14}>›</Mono></View>
            </Pressable>
          ))}
          <Hairline />
          <Body tone="t3" size={13} style={{ paddingHorizontal: 24, paddingTop: 18 }}>Muscle map, the Vault and ratings arrive with v1.0.</Body>
        </ScrollView>
      </SafeAreaView>
    </Zone>
  );
}
