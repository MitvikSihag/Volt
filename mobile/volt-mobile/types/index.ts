export interface User {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  followersCount: number;
  followingCount: number;
  workoutsCount: number;
  activitiesCount: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string;
  isCustom: boolean;
}

export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  setType: SetType;
  completed: boolean;
  isPersonalRecord?: boolean;
}

export interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  title: string;
  startedAt: string;
  finishedAt?: string;
  durationSeconds?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  totalVolume?: number;
}

export type ActivityType = 'run' | 'ride' | 'hike' | 'walk';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Lap {
  lapNumber: number;
  distanceMeters: number;
  durationSeconds: number;
  avgPaceSecondsPerKm?: number;
  avgHeartRate?: number;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  avgPaceSecondsPerKm?: number;
  elevationGain?: number;
  avgHeartRate?: number;
  route?: LatLng[];
  laps?: Lap[];
  kudosCount: number;
  hasGivenKudos: boolean;
}

export interface FeedItem {
  id: string;
  type: 'workout' | 'activity';
  user: User;
  workout?: Workout;
  activity?: Activity;
  createdAt: string;
}
