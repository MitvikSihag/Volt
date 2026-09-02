import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/store';
export default function Index() {
  const token = useAuth((s) => s.accessToken);
  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}
