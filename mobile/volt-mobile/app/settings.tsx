import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { PrType, useSettings } from '@/settings/store';
import { Body, Hairline, Heading, Meta, Mono, Zone } from '@/ui/primitives';
import { color, font } from '@/ui/tokens';

const PR: { k: PrType; l: string; sub: string }[] = [
  { k: 'ONE_REP_MAX', l: 'Estimated 1RM', sub: 'Epley, reps ≤ 10' }, { k: 'MAX_WEIGHT', l: 'Heaviest set', sub: 'Any reps' },
  { k: 'MAX_VOLUME', l: 'Session volume', sub: 'Per exercise' }, { k: 'MAX_REPS_AT_WEIGHT', l: 'Reps at a weight', sub: 'Same load, more reps' },
];
const REST = [60, 90, 120, 150, 180];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<View style={{ paddingTop: 28 }}><Meta tone="t3" style={{ paddingHorizontal: 24, paddingBottom: 6 }}>{title}</Meta><Hairline />{children}</View>);
}
function Row({ label, sub, right, onPress }: { label: string; sub?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (<>
    <Pressable onPress={onPress} disabled={!onPress} style={{ paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}><Body size={15}>{label}</Body>{sub && <Meta tone="t3">{sub}</Meta>}</View>
      {right}
    </Pressable>
    <Hairline />
  </>);
}
const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <Switch value={value} onValueChange={onChange} trackColor={{ true: color.t1, false: color.raised }} thumbColor={value ? color.sunken : color.t3} />
);

export default function Settings() {
  const router = useRouter(); const s = useSettings();
  const version = Constants.expoConfig?.version ?? '0.1.0';
  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
          <Heading style={{ marginTop: 12 }}>Settings</Heading>
        </View>

        <Section title="Units">
          <Row label="Weight" sub="kg is the default everywhere" right={
            <View style={{ flexDirection: 'row', backgroundColor: color.raised, borderRadius: 16, padding: 2 }}>
              {(['kg', 'lb'] as const).map((u) => (
                <Pressable key={u} onPress={() => s.set({ unit: u })} style={{ paddingHorizontal: 14, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: s.unit === u ? color.t1 : 'transparent' }}>
                  <Mono size={12} style={{ color: s.unit === u ? color.sunken : color.t2 }}>{u}</Mono>
                </Pressable>
              ))}
            </View>} />
        </Section>

        <Section title="Rest timer">
          <Row label="Default rest" sub="Used when a routine has none" right={
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {REST.map((r) => (
                <Pressable key={r} onPress={() => s.set({ restSeconds: r })} style={{ paddingHorizontal: 9, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: s.restSeconds === r ? color.t1 : color.raised }}>
                  <Mono size={11} style={{ color: s.restSeconds === r ? color.sunken : color.t2 }}>{Math.floor(r / 60)}:{String(r % 60).padStart(2, '0')}</Mono>
                </Pressable>
              ))}
            </View>} />
        </Section>

        <Section title="Plate config">
          <Row label="Bar weight" sub="kg" right={
            <TextInput value={String(s.barKg)} onChangeText={(t) => { const n = Number(t); if (!Number.isNaN(n)) s.set({ barKg: n }); }} keyboardType="decimal-pad" style={{ width: 64, height: 32, borderRadius: 8, backgroundColor: color.raised, color: color.t1, fontFamily: font.mono, fontSize: 14, textAlign: 'right', paddingHorizontal: 10 }} />} />
          <Row label="Available plates" sub="Tap to toggle · kg" right={null} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, paddingBottom: 14 }}>
            {[25, 20, 15, 10, 5, 2.5, 1.25, 0.5].map((p) => {
              const on = s.plates.includes(p);
              return (
                <Pressable key={p} onPress={() => s.set({ plates: on ? s.plates.filter((x) => x !== p) : [...s.plates, p] })} style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: on ? color.t1 : color.raised }}>
                  <Mono size={12} style={{ color: on ? color.sunken : color.t3 }}>{p}</Mono>
                </Pressable>
              );
            })}
          </View>
          <Hairline />
        </Section>

        <Section title="PR types">
          {PR.map((p) => <Row key={p.k} label={p.l} sub={p.sub} right={<Toggle value={s.prTypes[p.k]} onChange={(v) => s.set({ prTypes: { ...s.prTypes, [p.k]: v } })} />} />)}
          <Body tone="t3" size={12} style={{ paddingHorizontal: 24, paddingTop: 10 }}>Only the kinds you keep on earn medals or reach your feed. Everything is still recorded.</Body>
        </Section>

        <Section title="Privacy defaults">
          <Row label="Privacy & map trim" sub={`${s.hideStart || s.hideEnd ? 'Ends trimmed' : 'No trim'} · ${s.trimMeters} m · visible to ${s.visibility.toLowerCase().replace('_', ' ')}`} onPress={() => router.push('/run/privacy')} right={<Mono tone="t3">›</Mono>} />
        </Section>

        <Section title="Competition">
          {([['rivals', 'Rivals'], ['boards', 'Load boards'], ['challenges', 'Challenges']] as const).map(([k, l]) => (
            <Row key={k} label={l} right={<Toggle value={s.competition[k]} onChange={(v) => s.set({ competition: { ...s.competition, [k]: v } })} />} />
          ))}
          <Body tone="t3" size={12} style={{ paddingHorizontal: 24, paddingTop: 10 }}>Same switches as the hide buttons on each board.</Body>
        </Section>

        <Section title="Connected">
          {['Apple Health', 'Garmin', 'Strava import'].map((l) => <Row key={l} label={l} right={<Meta tone="t3">Arrives with v1.2</Meta>} />)}
        </Section>

        <Section title="About">
          <Row label="Version" right={<Mono tone="t2" size={13}>{version}</Mono>} />
          <Row label="Log out" onPress={() => useAuth.getState().logout()} right={<Mono tone="t3">›</Mono>} />
        </Section>
        <Body tone="t3" size={13} style={{ paddingHorizontal: 24, paddingTop: 28 }}>No tiers. Nothing to upgrade. Every feature is the whole feature.</Body>
      </ScrollView>
    </SafeAreaView></Zone>
  );
}
