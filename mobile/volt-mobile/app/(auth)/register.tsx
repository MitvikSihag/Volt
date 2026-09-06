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

export default function Register() {
  const register = useAuth((s) => s.register); const next = useAuth((s) => s.next);
  const [username, setUsername] = useState(''); const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const valid = username.trim().length >= 3 && email.includes('@') && pw.length >= 8;
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await register(username.trim(), email.trim(), pw); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not create account'); } finally { setBusy(false); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <AuthClose />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 16 }}><Bolt size={40} /></View>
          <Heading style={{ marginBottom: next ? 8 : 24 }}>{next ? 'Keep what you just logged.' : 'Create your account.'}</Heading>
          {next && <Body tone="t2" size={13} style={{ marginBottom: 20 }}>Your session stays on this phone until it's saved to your account.</Body>}
          <TextInput style={field} placeholder="Username" placeholderTextColor={color.t3} autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} />
          <TextInput style={field} placeholder="Email" placeholderTextColor={color.t3} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} value={email} onChangeText={setEmail} />
          <TextInput style={field} placeholder="Password (8+ characters)" placeholderTextColor={color.t3} secureTextEntry value={pw} onChangeText={setPw} onSubmitEditing={submit} />
          {err && <Body tone="ember" size={13}>{err}</Body>}
          <View style={{ height: 8 }} />
          <Button label={busy ? 'Creating…' : 'Create account'} onPress={submit} disabled={busy || !valid} />
          <Link href="/(auth)/login" style={{ alignSelf: 'center', marginTop: 16 }}><Body tone="t2">Have an account? Sign in</Body></Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
