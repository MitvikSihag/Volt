import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { field } from '@/ui/field';
import { Bolt } from '@/ui/Bolt';
import { Body, Button, Heading, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function Reset() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const resetPassword = useAuth((s) => s.resetPassword); const router = useRouter();
  const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!token) return;
    setBusy(true); setErr(null);
    try { await resetPassword(token, pw); router.replace('/(auth)/login'); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not reset the password'); } finally { setBusy(false); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 16 }}><Bolt size={40} /></View>
          <Heading style={{ marginBottom: 24 }}>Set a new password.</Heading>
          {!token && <Body tone="ember" size={13}>This link is missing its token. Request a new one from the sign-in screen.</Body>}
          <TextInput style={field} placeholder="New password (8+ characters)" placeholderTextColor={color.t3} secureTextEntry value={pw} onChangeText={setPw} onSubmitEditing={submit} />
          {err && <Body tone="ember" size={13}>{err}</Body>}
          <View style={{ height: 8 }} />
          <Button label={busy ? 'Saving…' : 'Set new password'} onPress={submit} disabled={busy || !token || pw.length < 8} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
