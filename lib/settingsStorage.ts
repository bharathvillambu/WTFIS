import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RADIUS_METERS, AGE_ACCEPTED_STORAGE_KEY } from '@/constants/config';

const RADIUS_KEY = 'insta-locator:radar-radius';

export async function getStoredRadius(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(RADIUS_KEY);
    return value ? parseInt(value, 10) : DEFAULT_RADIUS_METERS;
  } catch {
    return DEFAULT_RADIUS_METERS;
  }
}

export async function setStoredRadius(radiusMeters: number): Promise<void> {
  try {
    await AsyncStorage.setItem(RADIUS_KEY, String(radiusMeters));
  } catch {
    // Non-fatal; radius will fall back to default next launch.
  }
}

/** True when the user has already accepted the 18+ age gate + T&C. */
export async function getAgeAccepted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AGE_ACCEPTED_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setAgeAccepted(accepted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AGE_ACCEPTED_STORAGE_KEY, accepted ? 'true' : 'false');
  } catch {
    // Non-fatal — user will just see the gate again next launch.
  }
}

