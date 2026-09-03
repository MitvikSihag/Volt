import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/auth/store';
import { onboardingActive, useOnboarding } from '@/onboarding/store';
import { color } from '@/ui/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: 24 * 60 * 60 * 1000, staleTime: 60 * 1000, networkMode: 'offlineFirst', retry: 1 },
    mutations: { retry: 2 },
  },
});
const persister = createAsyncStoragePersister({ storage: AsyncStorage });

function AuthGate() {
  const token = useAuth((s) => s.accessToken); const next = useAuth((s) => s.next);
  const onboarding = useOnboarding((o) => onboardingActive(o)); const seen = useOnboarding((o) => o.goal != null || o.done);
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    const inAuth = segments[0] === '(auth)'; const inOnboarding = segments[0] === '(onboarding)'; const inWorkout = segments[0] === 'workout';
    if (!token && !inAuth && !inOnboarding && !(onboarding && inWorkout)) router.replace(seen ? '/(auth)/register' : '/(onboarding)/goal');
    if (token && inAuth) {
      useAuth.setState({ next: null });
      if (router.canDismiss()) router.dismissAll();
      if (next) router.push(next as '/(tabs)'); else router.replace('/(tabs)');
    }
  }, [token, segments, onboarding]);
  return null;
}

export default function RootLayout() {
  const hydrated = useAuth((s) => s.hydrated);
  useEffect(() => { void useAuth.getState().hydrate(); }, []);
  const [fontsReady] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold });
  if (!fontsReady || !hydrated) return <View style={{ flex: 1, backgroundColor: color.base }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.base }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <StatusBar style="light" />
        <AuthGate />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.base }, animation: 'fade', animationDuration: 200 }}>
          <Stack.Screen name="(auth)" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout/live" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="workout/picker" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workout/finish" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="workout/summary" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="run/live" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="run/save" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="run/privacy" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9], sheetGrabberVisible: false, contentStyle: { backgroundColor: '#171717' } }} />
          <Stack.Screen name="profile" />
          <Stack.Screen name="history" />
          <Stack.Screen name="exercise/[id]" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
