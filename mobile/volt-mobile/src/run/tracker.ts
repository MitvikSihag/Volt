import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useRun } from './store';

export const RUN_TASK = 'volt-run-location';
let watch: Location.LocationSubscription | null = null;

const push = (l: Location.LocationObject) =>
  useRun.getState().addPoint({ lat: l.coords.latitude, lng: l.coords.longitude, alt: l.coords.altitude, t: l.timestamp });

// Background updates land here even when the app is killed on Android / suspended on iOS.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(RUN_TASK, async ({ data, error }) => {
  if (error || !data) return;
  for (const l of data.locations) push(l);
});

const OPTS = { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000 };

export async function startTracking(): Promise<void> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) throw new Error('Location permission is needed to record a run.');
  const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
  if (bg?.granted) {
    await Location.startLocationUpdatesAsync(RUN_TASK, {
      ...OPTS, activityType: Location.ActivityType.Fitness, showsBackgroundLocationIndicator: true, pausesUpdatesAutomatically: false,
      foregroundService: { notificationTitle: 'Volt is recording your run', notificationBody: 'Tap to return to Live Run', notificationColor: '#121212' },
    });
  } else {
    watch = await Location.watchPositionAsync(OPTS, push);
  }
}

export async function stopTracking(): Promise<void> {
  watch?.remove(); watch = null;
  if (await Location.hasStartedLocationUpdatesAsync(RUN_TASK).catch(() => false)) await Location.stopLocationUpdatesAsync(RUN_TASK);
}
