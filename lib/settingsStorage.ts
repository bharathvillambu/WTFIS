import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RADIUS_METERS, AGE_ACCEPTED_STORAGE_KEY } from '@/constants/config';

const RADIUS_KEY = 'insta-locator:radar-radius';
const HAS_PROFILE_CACHE_KEY = 'insta-locator:has-profile-cache';

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

/**
 * Cache of the last confirmed "does this user have a completed profile"
 * result, keyed by user id. Used by the root router (`app/index.tsx`) so
 * that a transient network failure (e.g. opening the app offline) never
 * misroutes a returning user back into the Setup wizard just because the
 * live profile fetch couldn't complete. Only ever written after a
 * successful, authoritative network check.
 */
export async function getCachedHasProfile(userId: string): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(`${HAS_PROFILE_CACHE_KEY}:${userId}`);
    if (raw === null) return null;
    return raw === 'true';
  } catch {
    return null;
  }
}

export async function setCachedHasProfile(userId: string, hasProfile: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(`${HAS_PROFILE_CACHE_KEY}:${userId}`, hasProfile ? 'true' : 'false');
  } catch {
    // Non-fatal — worst case we just re-check next time there's network.
  }
}
