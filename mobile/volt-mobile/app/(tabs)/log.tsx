import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../store/workout-store';
import { RECENT_WORKOUTS } from '../../lib/mock-data';
import { formatDuration, formatRelativeTime } from '../../lib/format';
import { Colors, Typography, Spacing, Shadow } from '../../components/theme';

const TEMPLATES = [
  { id: 't1', name: 'Push Day A', exercises: ['Bench Press', 'OHP', 'Tricep Pushdown'] },
  { id: 't2', name: 'Pull Day A', exercises: ['Deadlift', 'Barbell Row', 'Pull-ups'] },
  { id: 't3', name: 'Leg Day A', exercises: ['Squat', 'Romanian Deadlift', 'Leg Press'] },
];

export default function LogScreen() {
  const session = useWorkoutStore((s) => s.session);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const handleStartBlank = () => {
    startWorkout('New Workout');
    router.push('/workout/active');
  };

  const handleStartTemplate = (name: string) => {
    startWorkout(name);
    router.push('/workout/active');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Log Workout</Text>

        {session && (
          <TouchableOpacity style={styles.resumeBanner} onPress={() => router.push('/workout/active')} activeOpacity={0.85}>
            <View>
              <Text style={styles.resumeTitle}>{session.title}</Text>
              <Text style={styles.resumeSub}>
                In progress · {session.exercises.length} exercises
              </Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.startSection}>
          <TouchableOpacity style={styles.blankButton} onPress={handleStartBlank} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.blankButtonText}>Start Empty Workout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Templates</Text>
        {TEMPLATES.map((t) => (
          <TouchableOpacity key={t.id} style={styles.templateCard} onPress={() => handleStartTemplate(t.name)} activeOpacity={0.8}>
            <View style={styles.templateLeft}>
              <Text style={styles.templateName}>{t.name}</Text>
              <Text style={styles.templateExercises}>{t.exercises.join(' · ')}</Text>
            </View>
            <Ionicons name="play-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>History</Text>
        {RECENT_WORKOUTS.map((w) => {
          const totalSets = w.exercises.reduce((acc, e) => acc + e.sets.length, 0);
          return (
            <View key={w.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>{w.title}</Text>
                <Text style={styles.historyTime}>{formatRelativeTime(w.startedAt)}</Text>
              </View>
              <Text style={styles.historyMeta}>
                {formatDuration(w.durationSeconds ?? 0)} · {w.exercises.length} exercises · {totalSets} sets
              </Text>
              <View style={styles.historyExercises}>
                {w.exercises.slice(0, 3).map((e) => (
                  <View key={e.id} style={styles.exercisePill}>
                    <Text style={styles.exercisePillText}>{e.exercise.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  heading: { ...Typography.h2, marginBottom: Spacing.md },
  resumeBanner: {
    backgroundColor: Colors.primary, borderRadius: 16, padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md, ...Shadow.md,
  },
  resumeTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resumeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  startSection: { marginBottom: Spacing.lg },
  blankButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.primary, ...Shadow.sm,
  },
  blankButtonText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.sm },
  templateCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm, ...Shadow.sm,
  },
  templateLeft: { flex: 1 },
  templateName: { ...Typography.body, fontWeight: '700' },
  templateExercises: { ...Typography.caption, marginTop: 2 },
  historyCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyTitle: { ...Typography.body, fontWeight: '700' },
  historyTime: { ...Typography.caption },
  historyMeta: { ...Typography.caption, marginBottom: Spacing.sm },
  historyExercises: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  exercisePill: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  exercisePillText: { ...Typography.caption, fontSize: 12 },
});
