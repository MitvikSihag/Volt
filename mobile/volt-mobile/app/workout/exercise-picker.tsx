import { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EXERCISES } from '../../lib/mock-data';
import { useWorkoutStore } from '../../store/workout-store';
import { Exercise } from '../../types';
import { Colors, Typography, Spacing, Shadow } from '../../components/theme';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Quads', 'Hamstrings', 'Glutes', 'Shoulders', 'Biceps', 'Triceps'];

export default function ExercisePickerScreen() {
  const [query, setQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const addExercise = useWorkoutStore((s) => s.addExercise);

  const filtered = useMemo(() => {
    return EXERCISES.filter((e) => {
      const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
      const matchesMuscle = selectedMuscle === 'All' || e.muscleGroups.includes(selectedMuscle);
      return matchesQuery && matchesMuscle;
    });
  }, [query, selectedMuscle]);

  const handleSelect = (exercise: Exercise) => {
    addExercise(exercise);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Exercise</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        data={MUSCLE_GROUPS}
        keyExtractor={(g) => g}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, selectedMuscle === item && styles.filterChipActive]}
            onPress={() => setSelectedMuscle(item)}
          >
            <Text style={[styles.filterChipText, selectedMuscle === item && styles.filterChipTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.exerciseRow} onPress={() => handleSelect(item)} activeOpacity={0.7}>
            <View style={[styles.equipmentIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="barbell-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.exerciseMeta}>{item.muscleGroups.join(', ')} · {item.equipment}</Text>
            </View>
            <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  title: { ...Typography.h3 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, margin: Spacing.md, marginTop: 0,
    borderRadius: 12, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text },
  filterRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { ...Typography.label, color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  separator: { height: 1, backgroundColor: Colors.border },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  equipmentIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...Typography.body, fontWeight: '600' },
  exerciseMeta: { ...Typography.caption, marginTop: 2 },
});
