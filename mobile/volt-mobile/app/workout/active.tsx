import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../store/workout-store';
import { Colors, Typography, Spacing, Shadow } from '../../components/theme';
import { SetType } from '../../types';

const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'W',
  warmup: 'WU',
  dropset: 'D',
  failure: 'F',
};

const SET_TYPE_COLORS: Record<SetType, string> = {
  normal: Colors.primary,
  warmup: Colors.warning,
  dropset: Colors.cardio.ride,
  failure: Colors.danger,
};

function RestTimer({ seconds, active, onStop }: { seconds: number; active: boolean; onStop: () => void }) {
  if (!active && seconds === 0) return null;
  return (
    <View style={timerStyles.container}>
      <Ionicons name="timer" size={16} color={Colors.primary} />
      <Text style={timerStyles.time}>{seconds}s</Text>
      <TouchableOpacity onPress={onStop}>
        <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  time: { fontSize: 15, fontWeight: '700', color: Colors.primary, fontVariant: ['tabular-nums'] },
});

export default function ActiveWorkoutScreen() {
  const session = useWorkoutStore((s) => s.session);
  const { addExercise, addSet, removeSet, updateSet, toggleSetComplete, stopRestTimer, tickRestTimer, endWorkout, discardWorkout } = useWorkoutStore();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  useEffect(() => {
    if (!session) startWorkout('New Workout');
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!session?.restTimerActive) return;
    const id = setInterval(() => tickRestTimer(), 1000);
    return () => clearInterval(id);
  }, [session?.restTimerActive]);

  const formatElapsed = () => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleFinish = () => {
    const s = session;
    if (!s || s.exercises.length === 0) {
      Alert.alert('Empty workout', 'Add at least one exercise before finishing.');
      return;
    }
    Alert.alert('Finish Workout?', 'This will save your workout.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Finish', onPress: () => { endWorkout(); router.back(); } },
    ]);
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout?', 'All progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { discardWorkout(); router.back(); } },
    ]);
  };

  if (!session) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleDiscard}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.timerBox}>
            <Text style={styles.timer}>{formatElapsed()}</Text>
            <RestTimer seconds={session.restTimerSeconds} active={session.restTimerActive} onStop={stopRestTimer} />
          </View>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>Finish</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.titleInput}
            value={session.title}
            placeholder="Workout name"
            placeholderTextColor={Colors.textMuted}
          />

          {session.exercises.map((ex) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
                <Text style={styles.muscleGroups}>{ex.exercise.muscleGroups.join(', ')}</Text>
              </View>

              <View style={styles.setHeader}>
                <Text style={[styles.colLabel, styles.colType]}>Type</Text>
                <Text style={[styles.colLabel, styles.colNum]}>Set</Text>
                <Text style={[styles.colLabel, styles.colWeight]}>kg</Text>
                <Text style={[styles.colLabel, styles.colReps]}>Reps</Text>
                <Text style={[styles.colLabel, styles.colDone]}>✓</Text>
              </View>

              {ex.sets.map((set, i) => (
                <View key={i} style={[styles.setRow, set.completed && styles.setRowDone]}>
                  <TouchableOpacity style={[styles.typeChip, { backgroundColor: `${SET_TYPE_COLORS[set.setType]}22` }]}>
                    <Text style={[styles.typeChipText, { color: SET_TYPE_COLORS[set.setType] }]}>
                      {SET_TYPE_LABELS[set.setType]}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.colNum, styles.setNum]}>{i + 1}</Text>
                  <TextInput
                    style={[styles.setInput, styles.colWeight]}
                    value={set.weight ?? ''}
                    onChangeText={(v) => updateSet(ex.id, i, 'weight', v)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.setInput, styles.colReps]}
                    value={set.reps ?? ''}
                    onChangeText={(v) => updateSet(ex.id, i, 'reps', v)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={[styles.checkBtn, set.completed && styles.checkBtnDone]}
                    onPress={() => toggleSetComplete(ex.id, i)}
                  >
                    <Ionicons name={set.completed ? 'checkmark' : 'checkmark-outline'} size={18} color={set.completed ? '#fff' : Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
                <Ionicons name="add" size={16} color={Colors.primary} />
                <Text style={styles.addSetBtnText}>Add Set</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addExerciseBtn} onPress={() => router.push('/workout/exercise-picker')}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  cancelBtn: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
  timerBox: { alignItems: 'center', gap: 4 },
  timer: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'], color: Colors.text },
  finishBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  content: { padding: Spacing.md, paddingBottom: 100 },
  titleInput: { ...Typography.h2, marginBottom: Spacing.md, padding: Spacing.sm, borderBottomWidth: 1.5, borderBottomColor: Colors.border },
  exerciseCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.sm },
  exerciseHeader: { marginBottom: Spacing.sm },
  exerciseName: { ...Typography.h3 },
  muscleGroups: { ...Typography.caption, marginTop: 2 },
  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  colLabel: { ...Typography.caption, fontWeight: '700', textAlign: 'center' },
  colType: { width: 40 },
  colNum: { width: 30 },
  colWeight: { flex: 1, textAlign: 'center' },
  colReps: { flex: 1, textAlign: 'center' },
  colDone: { width: 40, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  setRowDone: { backgroundColor: `${Colors.success}15` },
  setNum: { color: Colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  typeChip: { width: 36, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  typeChipText: { fontSize: 11, fontWeight: '800' },
  setInput: { fontSize: 16, fontWeight: '600', color: Colors.text, textAlign: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.border, marginHorizontal: 4 },
  checkBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  addSetBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary, ...Shadow.sm },
  addExerciseBtnText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
});
