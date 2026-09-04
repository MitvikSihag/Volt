import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExercises } from '@/api/queries';
import { humanMuscle, toInput } from '@/session/fromRoutine';
import { addExercise } from '@/session/reducer';
import { useSession } from '@/session/store';
import { field } from '@/ui/field';
import { Body, Hairline, Heading, Meta, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function Picker() {
  const router = useRouter(); const [q, setQ] = useState('');
  const { data } = useExercises();
  const dispatch = useSession((s) => s.dispatch);
  const list = (data ?? []).filter((e) => (e.name ?? '').toLowerCase().includes(q.toLowerCase()));
  return (
    <Zone style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Heading size={24}>Add exercise</Heading>
          <Pressable onPress={() => router.back()} hitSlop={12}><Meta tone="t2">Close</Meta></Pressable>
        </View>
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search exercises" placeholderTextColor={color.t3} autoCorrect={false} style={[field, { height: 48 }]} />
      </View>
      <FlatList data={list} keyExtractor={(e) => e.id ?? e.name ?? ''} ItemSeparatorComponent={Hairline} keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={() => { dispatch((s) => addExercise(s, toInput(item))); router.back(); }} style={{ paddingHorizontal: 24, paddingVertical: 14, gap: 2 }}>
            <Body>{item.name}</Body>
            <Meta>{humanMuscle(item.primaryMuscleGroup ?? '')} · {(item.equipment ?? '').toLowerCase()}</Meta>
          </Pressable>
        )}
        ListEmptyComponent={<Body tone="t3" style={{ padding: 24 }}>Nothing matches.</Body>} />
    </SafeAreaView></Zone>
  );
}
