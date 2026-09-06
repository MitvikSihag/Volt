import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/auth/store';
import { onboardingActive, useOnboarding } from '@/onboarding/store';
import { color } from '@/ui/tokens';

/** Escape hatch on the auth screens. Visible only while onboarding is active — the one state
 *  where the auth gate lets a tokenless user leave (back to their seeded week, or to the
 *  workout they were saving). Once onboarding is done, an account is required and there is
 *  genuinely nowhere to close to, so no X is shown. */
export function AuthClose() {
  const router = useRouter();
  const next = useAuth((s) => s.next);
  const active = useOnboarding((o) => onboardingActive(o));
  if (!active) return null;
  const close = () => {
    if (next && router.canGoBack()) { router.back(); return; }
    router.replace('/(onboarding)/week');
  };
  return (
    <Pressable
      onPress={close}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Close"
      style={{ position: 'absolute', top: 8, right: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
    >
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Path d="M2 2 L14 14 M14 2 L2 14" stroke={color.t2} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}
