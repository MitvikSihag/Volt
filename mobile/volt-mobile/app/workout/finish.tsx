import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveWorkout } from '@/api/queries';
import { formatElapsed } from '@/session/fromRoutine';
import { finishSession, loggedCount, markSaved } from '@/session/reducer';
import { useSession } from '@/session/store';
import { toRequest } from '@/session/toRequest';
import { field } from '@/ui/field';
import { Body, Button, Heading, Meta, Mono, Numeral, Zone } from '@/ui/primitives';
import { color, font } from '@/ui/tokens';

const RPE_WORDS: Record<number, string> = { 4: 'Easy — warm-up effort', 5: 'Comfortable', 6: 'Moderate — plenty left', 7: 'Hard but controlled', 8: 'Hard — could have held one more set', 9: 'Very hard — nothing spare', 10: 'Maximal' };

export default function Finish() {
  const router = useRouter(); const insets = useSafeAreaInsets();
  const session = useSession((s) => s.session); const dispatch = useSession((s) => s.dispatch); const discard = useSession((s) => s.discard);
  const save = useSaveWorkout();
  const [rpe, setRpe] = useState(session?.finish?.rpe ?? 8); const [note, setNote] = useState(session?.finish?.note ?? '');
  const [stoppedAt] = useState(() => session?.finish?.completedAt ?? new Date().toISOString());
  const [err, setErr] = useState<string | null>(null);
  if (!session) { router.dismissAll(); return null; }
  const sets = loggedCount(session);

  const onSave = async () => {
    setErr(null);
    const finished = finishSession(session, { rpe, note, now: stoppedAt });
    dispatch(() => finished);
    try {
      const w = await save.mutateAsync(toRequest(finished));
      dispatch(markSaved);
      router.replace({ pathname: '/workout/summary', params: { id: w.id ?? '' } });
    } catch (e) {
      setErr(`${e instanceof Error ? e.message : 'No connection'}. Your session is kept on this phone — retry from Today.`);
    }
  };
  const onDiscard = () => Alert.alert('Discard session?', 'This cannot be undone.', [{ text: 'Keep', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => { discard(); router.dismissAll(); } }]);

  return (
    <Zone style={{ flex: 1 }}><View style={{ flex: 1, padding: 24, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
      <Meta tone="t2">● Stopped</Meta>
      <Meta style={{ marginTop: 40 }}>Session ended</Meta>
      <Numeral size={72} style={{ marginTop: 8, fontFamily: font.monoMed, letterSpacing: -1 }}>{formatElapsed(Date.parse(stoppedAt) - Date.parse(session.startedAt))}</Numeral>
      <Body tone="t2" size={17}>{session.title}</Body>
      <Heading size={20} style={{ marginTop: 40 }}>How hard did that feel?</Heading>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
        {[4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Pressable key={n} onPress={() => setRpe(n)} style={{ flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: n === rpe ? color.t1 : color.raised }}>
            <Mono tone="t2" style={n === rpe ? { color: color.sunken } : undefined}>{n}</Mono>
          </Pressable>
        ))}
      </View>
      <Body tone="t3" size={13} style={{ marginTop: 10 }}>{RPE_WORDS[rpe]}</Body>
      <View style={{ flex: 1 }} />
      <View style={{ borderLeftWidth: 2, borderLeftColor: color.ember, paddingLeft: 12, marginBottom: 20, gap: 4 }}>
        <Body size={14}>Total volume computes on save</Body>
        <Meta>{sets} set{sets === 1 ? '' : 's'} · {session.exercises.filter((e) => e.logged.length).length} exercise{session.exercises.filter((e) => e.logged.length).length === 1 ? '' : 's'} logged</Meta>
      </View>
      <View style={{ marginBottom: 16 }}>
        <TextInput value={note} onChangeText={setNote} placeholder="Add a note for this session" placeholderTextColor={color.t3} multiline style={[field, { minHeight: 52, paddingVertical: 14, paddingRight: 88 }]} />
        <Meta tone="t3" style={{ position: 'absolute', right: 16, top: 19 }}>Optional</Meta>
      </View>
      {err && <Body tone="ember" size={13} style={{ marginBottom: 12 }}>{err}</Body>}
      <Button label={save.isPending ? 'Saving…' : 'Save session'} onPress={onSave} disabled={save.isPending || sets === 0} />
      {sets === 0 && <Body tone="t3" size={12} style={{ textAlign: 'center', marginTop: 8 }}>Log at least one set to save.</Body>}
      <Pressable onPress={onDiscard} style={{ alignSelf: 'center', paddingVertical: 14 }}><Body tone="t2">Discard</Body></Pressable>
    </View></Zone>
  );
}
