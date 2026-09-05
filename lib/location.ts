import * as Location from 'expo-location';
import type { Coordinates } from '@/types/user';

export type LocationError =
  | 'permission-denied'
  | 'services-disabled'
  | 'timeout'
  | 'unknown';

export interface LocationResult {
  coords: Coordinates | null;
  error: LocationError | null;
}

/** Requests foreground location permission if not already granted. */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getLocationPermissionStatus(): Promise<Location.PermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
}

/**
 * Gets a single current location fix. Intended to be called only while
 * Radar is actively open — this app does NOT track location in the
 * background.
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return { coords: null, error: 'services-disabled' };
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const granted = await requestLocationPermission();
      if (!granted) return { coords: null, error: 'permission-denied' };
    }

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 15000)
    );

    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const position = await Promise.race([locationPromise, timeoutPromise]);

    if (!position) {
      return { coords: null, error: 'timeout' };
    }

    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      error: null,
    };
  } catch (e) {
    return { coords: null, error: 'unknown' };
  }
}

