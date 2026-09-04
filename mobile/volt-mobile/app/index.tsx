import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/store';
import { useOnboarding } from '@/onboarding/store';
export default function Index() {
  const token = useAuth((s) => s.accessToken); const seen = useOnboarding((o) => o.goal != null || o.done);
  return <Redirect href={token ? '/(tabs)' : seen ? '/(auth)/register' : '/(onboarding)/goal'} />;
}
