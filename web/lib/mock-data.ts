import type { User, Workout, Activity, Exercise, FeedItem } from "./api";

export const mockUser: User = {
  id: "u1",
  username: "voltuser",
  email: "user@volt.app",
  displayName: "Alex Rider",
  avatarUrl: undefined,
  bio: "Running and lifting. Training for life.",
  followersCount: 142,
  followingCount: 89,
  workoutsCount: 48,
  activitiesCount: 23,
};

export const mockExercises: Exercise[] = [
  { id: "e1", name: "Barbell Back Squat", muscleGroups: ["Quads", "Glutes", "Hamstrings"], equipment: "Barbell", type: "strength", isSystem: true },
  { id: "e2", name: "Bench Press", muscleGroups: ["Chest", "Triceps", "Shoulders"], equipment: "Barbell", type: "strength", isSystem: true },
  { id: "e3", name: "Deadlift", muscleGroups: ["Back", "Glutes", "Hamstrings"], equipment: "Barbell", type: "strength", isSystem: true },
  { id: "e4", name: "Pull-Up", muscleGroups: ["Back", "Biceps"], equipment: "Bodyweight", type: "strength", isSystem: true },
  { id: "e5", name: "Overhead Press", muscleGroups: ["Shoulders", "Triceps"], equipment: "Barbell", type: "strength", isSystem: true },
  { id: "e6", name: "Romanian Deadlift", muscleGroups: ["Hamstrings", "Glutes"], equipment: "Barbell", type: "strength", isSystem: true },
  { id: "e7", name: "Incline Dumbbell Press", muscleGroups: ["Chest", "Shoulders"], equipment: "Dumbbell", type: "strength", isSystem: true },
  { id: "e8", name: "Barbell Row", muscleGroups: ["Back", "Biceps"], equipment: "Barbell", type: "strength", isSystem: true },
  { id: "e9", name: "Leg Press", muscleGroups: ["Quads", "Glutes"], equipment: "Machine", type: "strength", isSystem: true },
  { id: "e10", name: "Lat Pulldown", muscleGroups: ["Back", "Biceps"], equipment: "Cable", type: "strength", isSystem: true },
  { id: "e11", name: "Dumbbell Curl", muscleGroups: ["Biceps"], equipment: "Dumbbell", type: "strength", isSystem: true },
  { id: "e12", name: "Tricep Pushdown", muscleGroups: ["Triceps"], equipment: "Cable", type: "strength", isSystem: true },
];

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

export const mockWorkouts: Workout[] = [
  {
    id: "w1",
    name: "Upper Body Push",
    startedAt: daysAgo(1),
    completedAt: daysAgo(1),
    durationSeconds: 3840,
    totalVolume: 8250,
    prCount: 1,
    userId: "u1",
    sets: [
      { id: "s1", exerciseId: "e2", exercise: mockExercises[1], setNumber: 1, reps: 5, weight: 100, setType: "normal" },
      { id: "s2", exerciseId: "e2", exercise: mockExercises[1], setNumber: 2, reps: 5, weight: 100, setType: "normal" },
      { id: "s3", exerciseId: "e2", exercise: mockExercises[1], setNumber: 3, reps: 3, weight: 105, setType: "normal" },
      { id: "s4", exerciseId: "e5", exercise: mockExercises[4], setNumber: 1, reps: 8, weight: 70, setType: "normal" },
      { id: "s5", exerciseId: "e5", exercise: mockExercises[4], setNumber: 2, reps: 8, weight: 70, setType: "normal" },
      { id: "s6", exerciseId: "e7", exercise: mockExercises[6], setNumber: 1, reps: 10, weight: 32, setType: "normal" },
    ],
  },
  {
    id: "w2",
    name: "Leg Day",
    startedAt: daysAgo(3),
    completedAt: daysAgo(3),
    durationSeconds: 4500,
    totalVolume: 14200,
    prCount: 2,
    userId: "u1",
    sets: [
      { id: "s7", exerciseId: "e1", exercise: mockExercises[0], setNumber: 1, reps: 5, weight: 140, setType: "normal" },
      { id: "s8", exerciseId: "e1", exercise: mockExercises[0], setNumber: 2, reps: 5, weight: 140, setType: "normal" },
      { id: "s9", exerciseId: "e1", exercise: mockExercises[0], setNumber: 3, reps: 5, weight: 145, setType: "normal" },
      { id: "s10", exerciseId: "e6", exercise: mockExercises[5], setNumber: 1, reps: 8, weight: 100, setType: "normal" },
      { id: "s11", exerciseId: "e9", exercise: mockExercises[8], setNumber: 1, reps: 12, weight: 180, setType: "normal" },
    ],
  },
  {
    id: "w3",
    name: "Pull Day",
    startedAt: daysAgo(5),
    completedAt: daysAgo(5),
    durationSeconds: 3600,
    totalVolume: 7800,
    prCount: 0,
    userId: "u1",
    sets: [
      { id: "s12", exerciseId: "e3", exercise: mockExercises[2], setNumber: 1, reps: 3, weight: 180, setType: "normal" },
      { id: "s13", exerciseId: "e3", exercise: mockExercises[2], setNumber: 2, reps: 3, weight: 180, setType: "normal" },
      { id: "s14", exerciseId: "e4", exercise: mockExercises[3], setNumber: 1, reps: 8, weight: 0, setType: "normal" },
      { id: "s15", exerciseId: "e8", exercise: mockExercises[7], setNumber: 1, reps: 8, weight: 80, setType: "normal" },
      { id: "s16", exerciseId: "e10", exercise: mockExercises[9], setNumber: 1, reps: 10, weight: 65, setType: "normal" },
    ],
  },
];

export const mockActivities: Activity[] = [
  {
    id: "a1",
    name: "Morning Run",
    type: "run",
    startedAt: daysAgo(2),
    durationSeconds: 2340,
    distanceMeters: 6200,
    elevationGainMeters: 48,
    averageHeartRate: 158,
    maxHeartRate: 174,
    calories: 420,
    laps: [
      { number: 1, distanceMeters: 1000, durationSeconds: 375, elevationGain: 12 },
      { number: 2, distanceMeters: 1000, durationSeconds: 370, elevationGain: 8 },
      { number: 3, distanceMeters: 1000, durationSeconds: 378, elevationGain: 15 },
      { number: 4, distanceMeters: 1000, durationSeconds: 372, elevationGain: 7 },
      { number: 5, distanceMeters: 1000, durationSeconds: 368, elevationGain: 4 },
      { number: 6, distanceMeters: 1000, durationSeconds: 365, elevationGain: 2 },
    ],
    userId: "u1",
    kudosCount: 14,
    hasKudos: false,
  },
  {
    id: "a2",
    name: "Evening Ride",
    type: "ride",
    startedAt: daysAgo(6),
    durationSeconds: 5400,
    distanceMeters: 28500,
    elevationGainMeters: 280,
    averageHeartRate: 145,
    maxHeartRate: 168,
    calories: 720,
    laps: [],
    userId: "u1",
    kudosCount: 7,
    hasKudos: true,
  },
];

export const mockFeed: FeedItem[] = [
  { id: "f1", type: "workout", workout: mockWorkouts[0], user: mockUser, createdAt: daysAgo(1) },
  { id: "f2", type: "activity", activity: mockActivities[0], user: { ...mockUser, id: "u2", username: "kira_runs", displayName: "Kira M." }, createdAt: daysAgo(2) },
  { id: "f3", type: "workout", workout: mockWorkouts[1], user: mockUser, createdAt: daysAgo(3) },
  { id: "f4", type: "activity", activity: mockActivities[1], user: { ...mockUser, id: "u3", username: "ben_lifts", displayName: "Ben T." }, createdAt: daysAgo(6) },
];

export const mockVolumeData = [
  { week: "Apr 7", volume: 18200, workouts: 3 },
  { week: "Apr 14", volume: 21500, workouts: 4 },
  { week: "Apr 21", volume: 19800, workouts: 3 },
  { week: "Apr 28", volume: 24100, workouts: 4 },
  { week: "May 5", volume: 22600, workouts: 3 },
  { week: "May 12", volume: 26300, workouts: 5 },
];

export const mockProgressData = [
  { date: "Jan", squat: 120, bench: 80, deadlift: 150 },
  { date: "Feb", squat: 125, bench: 82.5, deadlift: 155 },
  { date: "Mar", squat: 130, bench: 85, deadlift: 162.5 },
  { date: "Apr", squat: 135, bench: 90, deadlift: 167.5 },
  { date: "May", squat: 140, bench: 95, deadlift: 175 },
];
