import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Heading, Zone } from '@/ui/primitives';
export default function Plan() {
  return <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, padding: 24 }}><Heading>Plan</Heading><Body tone="t3" style={{ marginTop: 8 }}>Your week, seeded from your goal. Arrives with v1.0.</Body></SafeAreaView></Zone>;
}
