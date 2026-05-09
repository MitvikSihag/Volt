import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { RECENT_WORKOUTS, RECENT_ACTIVITIES } from '../../lib/mock-data';
import { formatDuration, formatDistance, formatRelativeTime, formatVolume } from '../../lib/format';
import { Colors, Typography, Spacing, Shadow } from '../../components/theme';
import { Activity, ActivityType, Workout } from '../../types';

const ACTIVITY_ICONS: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
  run: 'walk',
  ride: 'bicycle',
  hike: 'trail-sign',
  walk: 'footsteps',
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  run: Colors.cardio.run,
  ride: Colors.cardio.ride,
  hike: Colors.cardio.hike,
  walk: Colors.cardio.walk,
};

function WorkoutCard({ workout }: { workout: Workout }) {
  const totalSets = workout.exercises.reduce((acc, e) => acc + e.sets.length, 0);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: Colors.primaryLight }]}>
          <Ionicons name="barbell" size={18} color={Colors.primary} />
        </View>
        <Text style={styles.cardTime}>{formatRelativeTime(workout.startedAt)}</Text>
      </View>
      <Text style={styles.cardTitle}>{workout.title}</Text>
      <View style={styles.cardStats}>
        <StatChip icon="time-outline" label={formatDuration(workout.durationSeconds ?? 0)} />
        <StatChip icon="layers-outline" label={`${totalSets} sets`} />
        {workout.totalVolume != null && (
          <StatChip icon="trending-up-outline" label={formatVolume(workout.totalVolume)} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const color = ACTIVITY_COLORS[activity.type];
  const icon = ACTIVITY_ICONS[activity.type];
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.cardTime}>{formatRelativeTime(activity.startedAt)}</Text>
      </View>
      <Text style={styles.cardTitle}>{activity.title}</Text>
      <View style={styles.cardStats}>
        <StatChip icon="time-outline" label={formatDuration(activity.durationSeconds)} />
        <StatChip icon="navigate-outline" label={formatDistance(activity.distanceMeters)} />
        {activity.avgHeartRate != null && (
          <StatChip icon="heart-outline" label={`${activity.avgHeartRate} bpm`} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function StatChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={Colors.textSecondary} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getGreeting()},</Text>
            <Text style={styles.name}>{user?.displayName ?? 'Athlete'} 👋</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.primaryAction} onPress={() => router.push('/workout/active')} activeOpacity={0.85}>
            <Ionicons name="barbell" size={22} color="#fff" />
            <Text style={styles.primaryActionText}>Start Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(tabs)/record')} activeOpacity={0.85}>
            <Ionicons name="navigate" size={22} color={Colors.primary} />
            <Text style={styles.secondaryActionText}>Record Activity</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {RECENT_WORKOUTS.map((w) => <WorkoutCard key={w.id} workout={w} />)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          {RECENT_ACTIVITIES.map((a) => <ActivityCard key={a.id} activity={a} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { ...Typography.body, color: Colors.textMuted },
  name: { ...Typography.h2, marginTop: 2 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  quickActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  primaryAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: 14, padding: Spacing.md, ...Shadow.md,
  },
  primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  secondaryActionText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  iconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTime: { ...Typography.caption },
  cardTitle: { ...Typography.h3, fontSize: 16, marginBottom: Spacing.sm },
  cardStats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { ...Typography.caption, color: Colors.textSecondary, fontSize: 12 },
});
