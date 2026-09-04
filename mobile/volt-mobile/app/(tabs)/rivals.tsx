import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Heading, Zone } from '@/ui/primitives';
export default function Rivals() {
  return <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, padding: 24 }}><Heading>Rivals</Heading><Body tone="t3" style={{ marginTop: 8 }}>Your weekly rival and the load board. Arrives with v1.1.</Body></SafeAreaView></Zone>;
}
