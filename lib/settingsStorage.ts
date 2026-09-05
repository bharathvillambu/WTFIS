import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RADIUS_METERS } from '@/constants/config';

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

