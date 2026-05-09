import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { RECENT_WORKOUTS, RECENT_ACTIVITIES } from '../../lib/mock-data';
import { Colors, Typography, Spacing, Shadow } from '../../components/theme';

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={danger ? Colors.danger : Colors.textSecondary} />
      <Text style={[styles.menuLabel, danger && { color: Colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{user.displayName[0]}</Text>
          </View>
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatBlock label="Workouts" value={user.workoutsCount} />
          <View style={styles.divider} />
          <StatBlock label="Activities" value={user.activitiesCount} />
          <View style={styles.divider} />
          <StatBlock label="Followers" value={user.followersCount} />
          <View style={styles.divider} />
          <StatBlock label="Following" value={user.followingCount} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          <View style={styles.prCard}>
            {[
              { name: 'Bench Press', weight: '102.5 kg', date: '3 weeks ago' },
              { name: 'Deadlift', weight: '160 kg', date: '1 week ago' },
              { name: 'Back Squat', weight: '140 kg', date: '2 months ago' },
            ].map((pr) => (
              <View key={pr.name} style={styles.prRow}>
                <View>
                  <Text style={styles.prName}>{pr.name}</Text>
                  <Text style={styles.prDate}>{pr.date}</Text>
                </View>
                <Text style={styles.prWeight}>{pr.weight}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
            <MenuRow icon="heart-outline" label="Apple Health" onPress={() => {}} />
            <MenuRow icon="barbell-outline" label="Plate Calculator" onPress={() => {}} />
            <MenuRow icon="shield-checkmark-outline" label="Privacy" onPress={() => {}} />
            <MenuRow icon="log-out-outline" label="Log Out" onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  header: { alignItems: 'center', padding: Spacing.lg },
  avatarLarge: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  displayName: { ...Typography.h2 },
  username: { ...Typography.body, color: Colors.textMuted, marginTop: 2 },
  bio: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.xl },
  editBtn: { marginTop: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  editBtnText: { ...Typography.label, color: Colors.text },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, paddingVertical: Spacing.md, marginHorizontal: Spacing.md, borderRadius: 16, marginBottom: Spacing.lg, ...Shadow.sm },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { ...Typography.caption, marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: Colors.border },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.sm },
  prCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', ...Shadow.sm },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  prName: { ...Typography.body, fontWeight: '700' },
  prDate: { ...Typography.caption, marginTop: 1 },
  prWeight: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  menuCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', ...Shadow.sm },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLabel: { ...Typography.body, flex: 1 },
});
