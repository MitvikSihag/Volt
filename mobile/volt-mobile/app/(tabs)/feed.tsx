import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FEED_ITEMS } from '../../lib/mock-data';
import { FeedItem, ActivityType } from '../../types';
import { formatDuration, formatDistance, formatRelativeTime } from '../../lib/format';
import { Colors, Typography, Spacing, Shadow } from '../../components/theme';

const TYPE_COLORS: Record<ActivityType, string> = {
  run: Colors.cardio.run,
  ride: Colors.cardio.ride,
  hike: Colors.cardio.hike,
  walk: Colors.cardio.walk,
};

function AvatarPlaceholder({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
    </View>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const [kudosGiven, setKudosGiven] = useState(item.activity?.hasGivenKudos ?? false);
  const [kudosCount, setKudosCount] = useState(item.activity?.kudosCount ?? 0);

  const handleKudos = () => {
    setKudosGiven((k) => !k);
    setKudosCount((c) => (kudosGiven ? c - 1 : c + 1));
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <AvatarPlaceholder name={item.user.displayName} />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{item.user.displayName}</Text>
          <Text style={styles.username}>@{item.user.username} · {formatRelativeTime(item.createdAt)}</Text>
        </View>
      </View>

      {item.type === 'workout' && item.workout && (
        <View style={styles.workoutBlock}>
          <View style={styles.blockHeader}>
            <Ionicons name="barbell" size={16} color={Colors.primary} />
            <Text style={styles.blockTitle}>{item.workout.title}</Text>
          </View>
          <Text style={styles.blockMeta}>
            {formatDuration(item.workout.durationSeconds ?? 0)} · {item.workout.exercises.length} exercises · {item.workout.exercises.reduce((a, e) => a + e.sets.length, 0)} sets
          </Text>
          <View style={styles.exerciseTags}>
            {item.workout.exercises.map((e) => (
              <View key={e.id} style={styles.tag}>
                <Text style={styles.tagText}>{e.exercise.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {item.type === 'activity' && item.activity && (
        <View style={styles.activityBlock}>
          <View style={styles.blockHeader}>
            <Ionicons name="navigate" size={16} color={TYPE_COLORS[item.activity.type]} />
            <Text style={[styles.blockTitle, { color: TYPE_COLORS[item.activity.type] }]}>{item.activity.title}</Text>
          </View>
          <View style={styles.activityStats}>
            <StatPill label="Distance" value={formatDistance(item.activity.distanceMeters)} />
            <StatPill label="Time" value={formatDuration(item.activity.durationSeconds)} />
            {item.activity.avgHeartRate != null && (
              <StatPill label="Avg HR" value={`${item.activity.avgHeartRate} bpm`} />
            )}
          </View>
          <View style={styles.kudosRow}>
            <TouchableOpacity style={styles.kudosBtn} onPress={handleKudos} activeOpacity={0.8}>
              <Ionicons name={kudosGiven ? 'flash' : 'flash-outline'} size={20} color={kudosGiven ? Colors.warning : Colors.textMuted} />
              <Text style={[styles.kudosCount, kudosGiven && { color: Colors.warning }]}>{kudosCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.commentBtn}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.commentText}>Comment</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

export default function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Feed</Text>
        <TouchableOpacity>
          <Ionicons name="person-add-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        {FEED_ITEMS.map((item) => <FeedCard key={item.id} item={item} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  heading: { ...Typography.h2 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, ...Shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  displayName: { ...Typography.body, fontWeight: '700' },
  username: { ...Typography.caption, marginTop: 1 },
  workoutBlock: { backgroundColor: Colors.primaryLight, borderRadius: 12, padding: Spacing.sm },
  activityBlock: {},
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  blockTitle: { ...Typography.body, fontWeight: '700' },
  blockMeta: { ...Typography.caption, marginBottom: Spacing.sm },
  exerciseTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { ...Typography.caption, fontSize: 12 },
  activityStats: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  statPill: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  statPillValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  statPillLabel: { ...Typography.caption, marginTop: 1 },
  kudosRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  kudosBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kudosCount: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentText: { ...Typography.caption, color: Colors.textMuted, fontSize: 14 },
});
