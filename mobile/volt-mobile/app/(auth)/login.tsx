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

export default function Login() {
  const login = useAuth((s) => s.login);
  const [id, setId] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await login(id.trim(), pw); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not sign in'); } finally { setBusy(false); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <AuthClose />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 16 }}><Bolt size={40} /></View>
          <Heading style={{ marginBottom: 24 }}>Sign in.</Heading>
          <TextInput style={field} placeholder="Username or email" placeholderTextColor={color.t3} autoCapitalize="none" autoCorrect={false} value={id} onChangeText={setId} />
          <TextInput style={field} placeholder="Password" placeholderTextColor={color.t3} secureTextEntry value={pw} onChangeText={setPw} onSubmitEditing={submit} />
          {err && <Body tone="ember" size={13}>{err}</Body>}
          <View style={{ height: 8 }} />
          <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy || !id || !pw} />
          <Link href="/(auth)/register" style={{ alignSelf: 'center', marginTop: 16 }}><Body tone="t2">New here? Create an account</Body></Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
