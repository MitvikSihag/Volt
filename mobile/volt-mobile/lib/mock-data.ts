import { Exercise, Workout, Activity, FeedItem, User } from '../types';

export const MOCK_USER: User = {
  id: 'u1',
  username: 'volt_user',
  displayName: 'Alex Carter',
  bio: 'Lifting heavy, running fast.',
  followersCount: 142,
  followingCount: 89,
  workoutsCount: 214,
  activitiesCount: 87,
};

export const EXERCISES: Exercise[] = [
  { id: 'e1', name: 'Barbell Back Squat', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], equipment: 'Barbell', isCustom: false },
  { id: 'e2', name: 'Bench Press', muscleGroups: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Barbell', isCustom: false },
  { id: 'e3', name: 'Deadlift', muscleGroups: ['Back', 'Glutes', 'Hamstrings'], equipment: 'Barbell', isCustom: false },
  { id: 'e4', name: 'Pull-up', muscleGroups: ['Back', 'Biceps'], equipment: 'Bodyweight', isCustom: false },
  { id: 'e5', name: 'Overhead Press', muscleGroups: ['Shoulders', 'Triceps'], equipment: 'Barbell', isCustom: false },
  { id: 'e6', name: 'Barbell Row', muscleGroups: ['Back', 'Biceps'], equipment: 'Barbell', isCustom: false },
  { id: 'e7', name: 'Romanian Deadlift', muscleGroups: ['Hamstrings', 'Glutes'], equipment: 'Barbell', isCustom: false },
  { id: 'e8', name: 'Incline Dumbbell Press', muscleGroups: ['Chest', 'Shoulders'], equipment: 'Dumbbell', isCustom: false },
  { id: 'e9', name: 'Lat Pulldown', muscleGroups: ['Back', 'Biceps'], equipment: 'Cable', isCustom: false },
  { id: 'e10', name: 'Leg Press', muscleGroups: ['Quads', 'Glutes'], equipment: 'Machine', isCustom: false },
  { id: 'e11', name: 'Tricep Pushdown', muscleGroups: ['Triceps'], equipment: 'Cable', isCustom: false },
  { id: 'e12', name: 'Dumbbell Curl', muscleGroups: ['Biceps'], equipment: 'Dumbbell', isCustom: false },
];

export const RECENT_WORKOUTS: Workout[] = [
  {
    id: 'w1',
    title: 'Push Day A',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    finishedAt: new Date(Date.now() - 86400000 + 3600000).toISOString(),
    durationSeconds: 3600,
    totalVolume: 8400,
    exercises: [
      {
        id: 'we1', exercise: EXERCISES[1],
        sets: [
          { id: 's1', exerciseId: 'e2', exercise: EXERCISES[1], reps: 5, weight: 100, rpe: 8, setType: 'normal', completed: true, isPersonalRecord: false },
          { id: 's2', exerciseId: 'e2', exercise: EXERCISES[1], reps: 5, weight: 100, rpe: 8, setType: 'normal', completed: true },
          { id: 's3', exerciseId: 'e2', exercise: EXERCISES[1], reps: 4, weight: 100, rpe: 9, setType: 'normal', completed: true },
        ],
      },
      {
        id: 'we2', exercise: EXERCISES[4],
        sets: [
          { id: 's4', exerciseId: 'e5', exercise: EXERCISES[4], reps: 8, weight: 70, rpe: 7, setType: 'normal', completed: true },
          { id: 's5', exerciseId: 'e5', exercise: EXERCISES[4], reps: 7, weight: 70, rpe: 8, setType: 'normal', completed: true },
        ],
      },
    ],
  },
  {
    id: 'w2',
    title: 'Pull Day A',
    startedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    finishedAt: new Date(Date.now() - 3 * 86400000 + 4200000).toISOString(),
    durationSeconds: 4200,
    totalVolume: 11200,
    exercises: [
      {
        id: 'we3', exercise: EXERCISES[2],
        sets: [
          { id: 's6', exerciseId: 'e3', exercise: EXERCISES[2], reps: 5, weight: 160, rpe: 8, setType: 'normal', completed: true, isPersonalRecord: true },
          { id: 's7', exerciseId: 'e3', exercise: EXERCISES[2], reps: 3, weight: 160, rpe: 9, setType: 'normal', completed: true },
        ],
      },
    ],
  },
];

export const RECENT_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    type: 'run',
    title: 'Morning 5K',
    startedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    durationSeconds: 1560,
    distanceMeters: 5120,
    avgPaceSecondsPerKm: 305,
    elevationGain: 42,
    avgHeartRate: 158,
    kudosCount: 7,
    hasGivenKudos: false,
    laps: [
      { lapNumber: 1, distanceMeters: 1000, durationSeconds: 295, avgPaceSecondsPerKm: 295 },
      { lapNumber: 2, distanceMeters: 1000, durationSeconds: 302, avgPaceSecondsPerKm: 302 },
      { lapNumber: 3, distanceMeters: 1000, durationSeconds: 308, avgPaceSecondsPerKm: 308 },
      { lapNumber: 4, distanceMeters: 1000, durationSeconds: 310, avgPaceSecondsPerKm: 310 },
      { lapNumber: 5, distanceMeters: 1120, durationSeconds: 345, avgPaceSecondsPerKm: 308 },
    ],
  },
  {
    id: 'a2',
    type: 'ride',
    title: 'Evening Ride',
    startedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    durationSeconds: 3600,
    distanceMeters: 28000,
    avgPaceSecondsPerKm: 128,
    elevationGain: 210,
    kudosCount: 12,
    hasGivenKudos: true,
  },
];

const FRIEND_1: User = { id: 'u2', username: 'jsmith', displayName: 'Jordan Smith', followersCount: 88, followingCount: 60, workoutsCount: 150, activitiesCount: 40 };
const FRIEND_2: User = { id: 'u3', username: 'mclarke', displayName: 'Morgan Clarke', followersCount: 210, followingCount: 130, workoutsCount: 320, activitiesCount: 200 };

export const FEED_ITEMS: FeedItem[] = [
  { id: 'f1', type: 'workout', user: FRIEND_1, workout: RECENT_WORKOUTS[0], createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'f2', type: 'activity', user: FRIEND_2, activity: RECENT_ACTIVITIES[0], createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'f3', type: 'workout', user: FRIEND_2, workout: RECENT_WORKOUTS[1], createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'f4', type: 'activity', user: FRIEND_1, activity: RECENT_ACTIVITIES[1], createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];
