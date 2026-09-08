import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeleteAccount } from '@/api/queries';
import { useAuth } from '@/auth/store';
import { field } from '@/ui/field';
import { Body, Button, Heading, Mono, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function DeleteAccount() {
  const router = useRouter(); const del = useDeleteAccount();
  const [pw, setPw] = useState(''); const [err, setErr] = useState<string | null>(null);
  const confirm = async () => {
    setErr(null);
    try { await del.mutateAsync(pw || undefined); await useAuth.getState().logout(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete the account'); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
          <Heading style={{ marginTop: 12 }}>Delete your account.</Heading>
          <Body tone="t2" style={{ marginBottom: 12 }}>Your workouts, runs, records and profile are removed. Sign-in stops immediately; data is purged within 30 days. This cannot be undone.</Body>
          <TextInput style={field} placeholder="Password (leave empty for Google-only accounts)" placeholderTextColor={color.t3} secureTextEntry value={pw} onChangeText={setPw} />
          {err && <Body tone="ember" size={13}>{err}</Body>}
          <View style={{ height: 8 }} />
          <Button label={del.isPending ? 'Deleting…' : 'Delete my account'} tone="ghost" onPress={confirm} disabled={del.isPending} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
