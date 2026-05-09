import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("volt_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("volt_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// --- Auth ---
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post("/api/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>("/api/auth/login", data),
  me: () => api.get<User>("/api/users/me"),
};

// --- Workouts ---
export const workoutsApi = {
  list: (params?: { page?: number; size?: number }) =>
    api.get<PagedResponse<Workout>>("/api/workouts", { params }),
  get: (id: string) => api.get<Workout>(`/api/workouts/${id}`),
  create: (data: CreateWorkoutRequest) =>
    api.post<Workout>("/api/workouts", data),
  update: (id: string, data: Partial<CreateWorkoutRequest>) =>
    api.put<Workout>(`/api/workouts/${id}`, data),
  delete: (id: string) => api.delete(`/api/workouts/${id}`),
};

// --- Exercises ---
export const exercisesApi = {
  list: (params?: { search?: string; muscleGroup?: string }) =>
    api.get<Exercise[]>("/api/exercises", { params }),
  get: (id: string) => api.get<Exercise>(`/api/exercises/${id}`),
  create: (data: Partial<Exercise>) => api.post<Exercise>("/api/exercises", data),
};

// --- Activities ---
export const activitiesApi = {
  list: (params?: { page?: number; size?: number }) =>
    api.get<PagedResponse<Activity>>("/api/activities", { params }),
  get: (id: string) => api.get<Activity>(`/api/activities/${id}`),
};

// --- Social ---
export const socialApi = {
  feed: (params?: { page?: number }) =>
    api.get<PagedResponse<FeedItem>>("/api/feed", { params }),
  follow: (userId: string) => api.post(`/api/users/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/api/users/${userId}/follow`),
  kudos: (activityId: string) =>
    api.post(`/api/activities/${activityId}/kudos`),
};

// --- Types ---
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
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
  type: "strength" | "cardio" | "stretching";
  isSystem: boolean;
  instructions?: string;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  setNumber: number;
  reps: number;
  weight: number;
  setType: "normal" | "warmup" | "dropset" | "failure";
  rpe?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  notes?: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  sets: WorkoutSet[];
  userId: string;
  user?: User;
  totalVolume: number;
  prCount: number;
}

export interface CreateWorkoutRequest {
  name: string;
  notes?: string;
  startedAt: string;
  completedAt?: string;
  sets: Omit<WorkoutSet, "id" | "exercise">[];
}

export interface GpsPoint {
  lat: number;
  lng: number;
  elevation?: number;
  timestamp: string;
}

export interface Lap {
  number: number;
  distanceMeters: number;
  durationSeconds: number;
  elevationGain: number;
}

export interface Activity {
  id: string;
  name: string;
  type: "run" | "ride" | "hike" | "walk" | "swim";
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  route?: { points: GpsPoint[] };
  laps: Lap[];
  userId: string;
  user?: User;
  kudosCount: number;
  hasKudos: boolean;
}

export interface FeedItem {
  id: string;
  type: "workout" | "activity";
  workout?: Workout;
  activity?: Activity;
  user: User;
  createdAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
