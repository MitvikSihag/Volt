import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration, formatDistance, formatPace } from '../../lib/format';
import { Colors, Typography, Spacing, Shadow } from '../../components/theme';
import { ActivityType } from '../../types';

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'run', label: 'Run', icon: 'walk' },
  { type: 'ride', label: 'Ride', icon: 'bicycle' },
  { type: 'hike', label: 'Hike', icon: 'trail-sign' },
  { type: 'walk', label: 'Walk', icon: 'footsteps' },
];

const TYPE_COLORS: Record<ActivityType, string> = {
  run: Colors.cardio.run,
  ride: Colors.cardio.ride,
  hike: Colors.cardio.hike,
  walk: Colors.cardio.walk,
};

export default function RecordScreen() {
  const [selectedType, setSelectedType] = useState<ActivityType>('run');
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (recording && !paused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
        setDistance((d) => d + (Math.random() * 4 + 1)); // simulate ~3-5 m/s
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [recording, paused]);

  const handleStart = () => {
    setRecording(true);
    setPaused(false);
    setElapsedSeconds(0);
    setDistance(0);
  };

  const handlePause = () => setPaused((p) => !p);

  const handleStop = () => {
    setRecording(false);
    setPaused(false);
    // TODO: save activity + navigate to summary
  };

  const pace = elapsedSeconds > 0 && distance > 0
    ? Math.round(elapsedSeconds / (distance / 1000))
    : null;

  const color = TYPE_COLORS[selectedType];

  if (recording) {
    return (
      <SafeAreaView style={[styles.container, styles.activeContainer]} edges={['top', 'bottom']}>
        <View style={styles.activeHeader}>
          <Text style={styles.activityTypeLabel}>{ACTIVITY_TYPES.find((t) => t.type === selectedType)?.label}</Text>
          {paused && <View style={styles.pausedBadge}><Text style={styles.pausedText}>PAUSED</Text></View>}
        </View>

        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={60} color={Colors.border} />
          <Text style={styles.mapPlaceholderText}>GPS map view</Text>
          <Text style={styles.mapPlaceholderSub}>(requires device GPS)</Text>
        </View>

        <View style={styles.statsRow}>
          <MetricBlock label="Distance" value={formatDistance(distance)} color={color} />
          <MetricBlock label="Time" value={formatDuration(elapsedSeconds)} color={color} />
          <MetricBlock label="Pace" value={pace ? formatPace(pace) : '--:--'} color={color} />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={[styles.stopBtn]} onPress={handleStop}>
            <Ionicons name="stop" size={28} color={Colors.danger} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pauseBtn, { backgroundColor: color }]} onPress={handlePause}>
            <Ionicons name={paused ? 'play' : 'pause'} size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Record Activity</Text>

        <Text style={styles.sectionLabel}>Activity Type</Text>
        <View style={styles.typeGrid}>
          {ACTIVITY_TYPES.map(({ type, label, icon }) => {
            const active = selectedType === type;
            const c = TYPE_COLORS[type];
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeCard, active && { borderColor: c, backgroundColor: `${c}15` }]}
                onPress={() => setSelectedType(type)}
                activeOpacity={0.8}
              >
                <Ionicons name={icon} size={28} color={active ? c : Colors.textMuted} />
                <Text style={[styles.typeLabel, active && { color: c, fontWeight: '700' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.locationNote}>
          <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.locationNoteText}>GPS tracking will start automatically when you begin</Text>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: TYPE_COLORS[selectedType] }]}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={22} color="#fff" />
          <Text style={styles.startBtnText}>Start {ACTIVITY_TYPES.find((t) => t.type === selectedType)?.label}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metricBlock}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  heading: { ...Typography.h2, marginBottom: Spacing.lg },
  sectionLabel: { ...Typography.label, marginBottom: Spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeCard: {
    flex: 1, minWidth: '45%', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md,
    borderWidth: 2, borderColor: Colors.border, gap: Spacing.xs, ...Shadow.sm,
  },
  typeLabel: { ...Typography.label, color: Colors.textMuted, fontSize: 14 },
  locationNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xl },
  locationNoteText: { ...Typography.caption, flex: 1 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: 16, padding: 18, ...Shadow.md,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Active recording styles
  activeContainer: { backgroundColor: '#0F0F14' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md },
  activityTypeLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  pausedBadge: { backgroundColor: Colors.warning, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  pausedText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  mapPlaceholderText: { color: Colors.textMuted, fontSize: 16 },
  mapPlaceholderSub: { color: Colors.textMuted, fontSize: 13 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.05)', margin: Spacing.md, borderRadius: 16 },
  metricBlock: { alignItems: 'center' },
  metricValue: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.lg },
  stopBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.danger },
  pauseBtn: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
});
