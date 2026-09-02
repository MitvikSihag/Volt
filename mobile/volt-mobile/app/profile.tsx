import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMe } from '@/api/queries';
import { useAuth } from '@/auth/store';
import { Body, Button, Heading, Meta, Zone } from '@/ui/primitives';

export default function Profile() {
  const { data: me } = useMe(); const router = useRouter();
  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, padding: 24, gap: 12 }}>
      <Button label="Back" tone="ghost" onPress={() => router.back()} />
      <Heading style={{ marginTop: 24 }}>{me?.displayName ?? me?.username ?? '—'}</Heading>
      <Meta>{me?.username}</Meta>
      <Body tone="t3">Vault, muscle map and ratings arrive with v1.0.</Body>
      <Button label="Log out" tone="ghost" onPress={() => useAuth.getState().logout()} />
    </SafeAreaView></Zone>
  );
}
