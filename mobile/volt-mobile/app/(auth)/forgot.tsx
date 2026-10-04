import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { AuthClose } from '@/ui/AuthClose';
import { field } from '@/ui/field';
import { Bolt } from '@/ui/Bolt';
import { Body, Button, Heading, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function Forgot() {
  const forgotPassword = useAuth((s) => s.forgotPassword);
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false); const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await forgotPassword(email.trim()); setSent(true); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not send the link'); } finally { setBusy(false); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <AuthClose />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 16 }}><Bolt size={40} /></View>
          <Heading style={{ marginBottom: 24 }}>Reset your password.</Heading>
          {sent ? (
            <Body tone="t2">If an account exists for that email, a reset link is on its way. Open it on this phone.</Body>
          ) : (
            <>
              <TextInput style={field} placeholder="Email" placeholderTextColor={color.t3} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} value={email} onChangeText={setEmail} onSubmitEditing={submit} />
              {err && <Body tone="ember" size={13}>{err}</Body>}
              <View style={{ height: 8 }} />
              <Button label={busy ? 'Sending…' : 'Send reset link'} onPress={submit} disabled={busy || !email.includes('@')} />
            </>
          )}
          <Link href="/(auth)/login" style={{ alignSelf: 'center', marginTop: 16 }}><Body tone="t2">Back to sign in</Body></Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
