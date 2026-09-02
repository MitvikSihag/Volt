import { usePathname, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatElapsed } from '@/session/fromRoutine';
import { loggedCount } from '@/session/reducer';
import { useSession } from '@/session/store';
import { Meta, Mono } from './primitives';
import { color } from './tokens';
import { useNow } from './useNow';

export function SessionPill() {
  const session = useSession((s) => s.session);
  const router = useRouter(); const path = usePathname(); const insets = useSafeAreaInsets();
  const now = useNow();
  if (!session || session.status !== 'live' || path.startsWith('/workout')) return null;
  return (
    <Pressable onPress={() => router.push('/workout/live')} style={{ position: 'absolute', left: 16, right: 16, bottom: 84 + insets.bottom + 8, height: 48, borderRadius: 24, backgroundColor: color.raised, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.ember }} />
      <Mono tone="ember" size={13}>{formatElapsed(now - Date.parse(session.startedAt))}</Mono>
      <Meta tone="t2" style={{ flex: 1 }} numberOfLines={1}>{session.title}</Meta>
      <Meta>{loggedCount(session)} sets</Meta>
    </Pressable>
  );
}
