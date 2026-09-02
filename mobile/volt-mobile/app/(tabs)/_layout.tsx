import { Tabs } from 'expo-router';
import { SessionPill } from '@/ui/SessionPill';
import { color, font } from '@/ui/tokens';
export default function TabsLayout() {
  return (
    <>
      <Tabs screenOptions={{
        headerShown: false, tabBarShowLabel: true, tabBarIconStyle: { display: 'none' },
        tabBarStyle: { backgroundColor: color.sunken, borderTopWidth: 0, height: 84, paddingTop: 12 },
        tabBarLabelStyle: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
        tabBarActiveTintColor: color.t1, tabBarInactiveTintColor: color.t3, sceneStyle: { backgroundColor: color.base },
      }}>
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
        <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
        <Tabs.Screen name="rivals" options={{ title: 'Rivals' }} />
      </Tabs>
      <SessionPill />
    </>
  );
}
