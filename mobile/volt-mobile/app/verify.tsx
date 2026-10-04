import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { Bolt } from '@/ui/Bolt';
import { Body, Button, Heading, Zone } from '@/ui/primitives';

export default function Verify() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const confirmEmail = useAuth((s) => s.confirmEmail); const hasSession = useAuth((s) => !!s.accessToken);
  const router = useRouter(); const qc = useQueryClient();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working'); const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!token) { setState('error'); setErr('This link is missing its token.'); return; }
    confirmEmail(token).then(() => { setState('done'); qc.invalidateQueries({ queryKey: ['me'] }); })
      .catch((e) => { setState('error'); setErr(e instanceof Error ? e.message : 'Could not verify'); });
  }, [token]);
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 16 }}><Bolt size={40} /></View>
          <Heading style={{ marginBottom: 12 }}>{state === 'working' ? 'Verifying…' : state === 'done' ? 'Email verified.' : 'That link did not work.'}</Heading>
          {err && <Body tone="ember" size={13}>{err}</Body>}
          {state !== 'working' && <Button label="Continue" onPress={() => router.replace(hasSession ? '/(tabs)' : '/(auth)/login')} />}
        </View>
      </SafeAreaView>
    </Zone>
  );
}
