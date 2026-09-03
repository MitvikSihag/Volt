import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trimEnds } from '@/run/geo';
import { useRun } from '@/run/store';
import { ShareField, useSettings } from '@/settings/store';
import { Body, Button, Hairline, Heading, Meta, Mono, Zone } from '@/ui/primitives';
import { RouteArt } from '@/ui/RouteArt';
import { color } from '@/ui/tokens';

const SHARE: { k: ShareField; l: string }[] = [{ k: 'pace', l: 'Pace' }, { k: 'distance', l: 'Distance' }, { k: 'load', l: 'Load' }, { k: 'heartRate', l: 'Heart rate' }, { k: 'photos', l: 'Photos' }, { k: 'splits', l: 'Splits' }];

export default function Privacy() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { width } = useWindowDimensions();
  const s = useSettings(); const points = useRun((r) => r.points);
  const trimmed = trimEnds(points, s.hideStart ? s.trimMeters : 0, s.hideEnd ? s.trimMeters : 0);
  const Row = ({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
      <Body size={15} style={{ flex: 1 }}>{label}</Body>
      {hint && <Meta tone="t3" style={{ marginRight: 12 }}>{hint}</Meta>}
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color.t1, false: color.raised }} thumbColor={value ? color.sunken : color.t3} />
    </View>
  );
  return (
    <Zone level="raised" style={{ flex: 1, paddingTop: 12 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}>
        <Heading size={22}>Privacy</Heading>
        <Body tone="t2" size={13} style={{ marginTop: 4 }}>Everything private about this run lives here</Body>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}><Meta tone="t3">Map trim</Meta><Mono tone="jade" size={13}>{s.trimMeters} m</Mono></View>
        <View style={{ marginTop: 8, backgroundColor: color.base, borderRadius: 12, overflow: 'hidden' }}>
          <RouteArt points={points} trimmed={trimmed} width={width - 48} height={120} />
        </View>
        <Slider style={{ marginTop: 8 }} minimumValue={0} maximumValue={600} step={50} value={s.trimMeters} onValueChange={(v) => s.set({ trimMeters: v })} minimumTrackTintColor={color.t1} maximumTrackTintColor={color.hairline} thumbTintColor={color.t1} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Meta tone="t3">0</Meta><Meta tone="t3">600 m</Meta></View>
        <Body tone="t2" size={13} style={{ marginTop: 6 }}>Trims the route before anyone sees it</Body>
        <View style={{ height: 16 }} /><Hairline />
        <Row label="Hide start point" value={s.hideStart} onChange={(v) => s.set({ hideStart: v })} hint={s.hideStart ? 'Default' : undefined} />
        <Hairline />
        <Row label="Hide end point" value={s.hideEnd} onChange={(v) => s.set({ hideEnd: v })} />
        <Hairline />
        <Meta tone="t3" style={{ marginTop: 24 }}>Share defaults</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {SHARE.map((f) => (
            <Pressable key={f.k} onPress={() => s.set({ share: { ...s.share, [f.k]: !s.share[f.k] } })} style={{ paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: s.share[f.k] ? color.t1 : color.base }}>
              <Body size={13} tone={s.share[f.k] ? 't1' : 't3'} style={s.share[f.k] ? { color: color.sunken } : undefined}>{f.l}</Body>
            </Pressable>
          ))}
        </View>
        <Body tone="t3" size={12} style={{ marginTop: 10 }}>Applies to this run and every future one</Body>
        <View style={{ height: 28 }} />
        <Button label="Done" onPress={() => router.back()} />
        <Pressable onPress={s.reset} style={{ alignSelf: 'center', paddingVertical: 14 }}><Body tone="t2" size={13}>Reset to my defaults</Body></Pressable>
      </ScrollView>
    </Zone>
  );
}
