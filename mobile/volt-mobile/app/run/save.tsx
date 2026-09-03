import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveActivity } from '@/api/queries';
import { encodePolyline, elevationGain, formatPace, paceSecPerKm, splits, totalDistance, trimEnds } from '@/run/geo';
import { activeMs, useRun } from '@/run/store';
import { formatElapsed } from '@/session/fromRoutine';
import { useSettings, Visibility } from '@/settings/store';
import { field } from '@/ui/field';
import { Body, Button, Hairline, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { RouteArt } from '@/ui/RouteArt';
import { color } from '@/ui/tokens';

const RPE_WORDS: Record<number, string> = { 4: 'Easy, conversational', 5: 'Steady', 6: 'Moderate', 7: 'Threshold, controlled', 8: 'Hard', 9: 'Very hard', 10: 'All out' };
const VIS: { k: Visibility; l: string }[] = [{ k: 'EVERYONE', l: 'Everyone' }, { k: 'FRIENDS', l: 'Friends' }, { k: 'ONLY_ME', l: 'Only me' }];
const defaultTitle = (d: Date) => { const h = d.getHours(); return `${h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'} run`; };

export default function SaveRun() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { width } = useWindowDimensions();
  const run = useRun(); const settings = useSettings(); const save = useSaveActivity();
  const started = run.startedAt ? new Date(run.startedAt) : new Date();
  const [title, setTitle] = useState(defaultTitle(started)); const [rpe, setRpe] = useState(7); const [note, setNote] = useState('');
  const distance = totalDistance(run.points); const elapsed = activeMs(run.segments); const gain = elevationGain(run.points);
  const trimmed = trimEnds(run.points, settings.hideStart ? settings.trimMeters : 0, settings.hideEnd ? settings.trimMeters : 0);
  const privacyLine = [settings.hideStart || settings.hideEnd ? `${settings.hideStart && settings.hideEnd ? 'Ends' : settings.hideStart ? 'Start' : 'End'} trimmed` : 'No trim', `${settings.trimMeters} m`].join(' · ');

  const onSave = async () => {
    const laps = splits(run.points).filter((s) => s.complete).map((s) => ({ distanceMeters: s.distanceMeters, durationSeconds: Math.round(s.durationSeconds), averagePaceMinPerKm: Math.round((s.pace / 60) * 100) / 100 }));
    try {
      await save.mutateAsync({
        title, type: 'RUN', startedAt: started.toISOString(), completedAt: new Date().toISOString(),
        durationSeconds: Math.round(elapsed / 1000), distanceMeters: Math.round(distance), elevationGainMeters: Math.round(gain),
        notes: [`RPE ${rpe}`, note.trim()].filter(Boolean).join(' · '),
        route: trimmed.length > 1 ? { encodedPolyline: encodePolyline(trimmed) } : undefined, laps,
      });
      run.reset();
      router.dismissAll();
    } catch (e) {
      Alert.alert("Couldn't save yet", `${e instanceof Error ? e.message : 'No connection'}. The run stays on this phone.`);
    }
  };
  const onDiscard = () => Alert.alert('Delete this run?', 'The route on this phone will be deleted.', [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { run.reset(); router.dismissAll(); } }]);

  return (
    <Zone style={{ flex: 1, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.base, zIndex: 1 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
        <Meta tone="t3">{started.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {started.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Meta>
        <Pressable onPress={onSave} hitSlop={12} disabled={save.isPending}><Body size={15}>{save.isPending ? 'Saving…' : 'Save'}</Body></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Meta tone="t3">Title</Meta>
          <TextInput value={title} onChangeText={setTitle} style={[field, { backgroundColor: 'transparent', paddingHorizontal: 0, fontSize: 22, fontFamily: 'Inter_600SemiBold', height: 44 }]} placeholder="Name this run" placeholderTextColor={color.t3} />
          <Body tone="t3" size={12}>Suggested from the time of day — change any time</Body>
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Meta tone="t3">Perceived effort</Meta><Body tone="t2" size={13}>{RPE_WORDS[rpe]}</Body></View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {[4, 5, 6, 7, 8, 9, 10].map((n) => (
              <Pressable key={n} onPress={() => setRpe(n)} style={{ flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: n === rpe ? color.t1 : color.raised }}>
                <Mono tone="t2" style={n === rpe ? { color: color.sunken } : undefined}>{n}</Mono>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <Meta tone="t3">Visible to</Meta>
          <View style={{ flexDirection: 'row', marginTop: 12, backgroundColor: color.raised, borderRadius: 22, padding: 3 }}>
            {VIS.map((v) => (
              <Pressable key={v.k} onPress={() => settings.set({ visibility: v.k })} style={{ flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: settings.visibility === v.k ? color.t1 : 'transparent' }}>
                <Body size={13} tone={settings.visibility === v.k ? 't1' : 't2'} style={settings.visibility === v.k ? { color: color.sunken } : undefined}>{v.l}</Body>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => router.push('/run/privacy')} style={{ marginTop: 12, backgroundColor: color.raised, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 3 }}><Body size={14}>Privacy & map trim</Body><Meta tone="t3">{privacyLine}</Meta></View>
            <Mono tone="t3">›</Mono>
          </Pressable>
        </View>
        <View style={{ marginTop: 24 }}>
          <RouteArt points={run.points} trimmed={trimmed} width={width} height={200} />
          <Meta tone="jade" style={{ paddingHorizontal: 24, marginTop: -6 }}>{privacyLine}</Meta>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 20 }}>
          {[{ v: (distance / 1000).toFixed(1), l: 'km' }, { v: formatElapsed(elapsed), l: 'Time' }, { v: formatPace(paceSecPerKm(distance, elapsed)), l: '/km' }, { v: Math.round(gain).toString(), l: 'Elev · m' }].map((s) => (
            <View key={s.l} style={{ flex: 1 }}><Mono tone="jade" size={17}>{s.v}</Mono><Meta tone="t3" style={{ marginTop: 4 }}>{s.l}</Meta></View>
          ))}
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <TextInput value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor={color.t3} multiline style={[field, { minHeight: 52, paddingVertical: 14 }]} />
        </View>
        <View style={{ padding: 24 }}>
          <Button label={save.isPending ? 'Saving…' : 'Save run'} onPress={onSave} disabled={save.isPending || run.points.length < 2} />
          <Pressable onPress={onDiscard} style={{ alignSelf: 'center', paddingVertical: 14 }}><Body tone="t2">Delete activity</Body></Pressable>
        </View>
      </ScrollView>
    </Zone>
  );
}
