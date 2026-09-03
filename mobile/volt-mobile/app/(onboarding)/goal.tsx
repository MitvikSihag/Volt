import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/onboarding/store';
import { GOALS, Goal } from '@/onboarding/templates';
import { Bolt } from '@/ui/Bolt';
import { Body, Button, Heading, Meta, Mono, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

const WEEKS = [8, 12, 16];

export default function GoalScreen() {
  const router = useRouter(); const o = useOnboarding();
  const [goal, setGoal] = useState<Goal>(o.goal ?? 'hyrox'); const [weeks, setWeeks] = useState(12);
  useEffect(() => { o.markOpened(); }, []);
  const g = GOALS.find((x) => x.k === goal)!;
  const dateFor = (w: number) => new Date(Date.now() + w * 7 * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
        <Bolt size={28} />
        <Heading style={{ marginTop: 28 }}>What are you{'\n'}training for?</Heading>
        <Body tone="t2" size={14} style={{ marginTop: 12 }}>One answer. Volt builds your first week from it — you can change everything after.</Body>
        <View style={{ gap: 10, marginTop: 28 }}>
          {GOALS.map((x) => {
            const on = x.k === goal;
            return (
              <Pressable key={x.k} onPress={() => setGoal(x.k)} style={{ borderRadius: 14, padding: 16, backgroundColor: color.raised, borderWidth: 1, borderColor: on ? color.ember : 'transparent', flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Body size={15}>{x.title}</Body>
                  <Meta tone="t3">{x.event && on ? `${dateFor(weeks)} · ${weeks} WEEKS OUT` : x.sub}</Meta>
                </View>
                {on && <Mono tone="ember" size={14}>●</Mono>}
              </Pressable>
            );
          })}
        </View>
        {g.event && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {WEEKS.map((w) => (
              <Pressable key={w} onPress={() => setWeeks(w)} style={{ paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: w === weeks ? color.t1 : color.raised }}>
                <Meta tone={w === weeks ? 't1' : 't3'} style={w === weeks ? { color: color.sunken } : undefined}>{w} weeks</Meta>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ flex: 1 }} />
        <View style={{ borderLeftWidth: 2, borderLeftColor: color.ember, paddingLeft: 12, marginTop: 28 }}>
          <Body tone="t2" size={13}>No account yet. Volt asks once you have something worth keeping.</Body>
        </View>
        <View style={{ height: 24 }} />
        <Button label="Build my week" onPress={() => { o.choose(goal, g.event ?? null, g.event ? weeks : null); router.push('/(onboarding)/week'); }} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {[0, 1, 2].map((i) => <View key={i} style={{ width: i === 0 ? 20 : 8, height: 3, borderRadius: 2, backgroundColor: i === 0 ? color.t1 : color.t4 }} />)}
        </View>
        <Pressable onPress={() => router.push('/(auth)/login')} style={{ alignSelf: 'center', paddingTop: 16 }}><Body tone="t3" size={13}>Have an account? Sign in</Body></Pressable>
      </ScrollView>
    </SafeAreaView></Zone>
  );
}
