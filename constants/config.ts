/**
 * Central app configuration.
 * Keep this file as the single source of truth for tunable MVP constants.
 */

/** Default Radar search radius, in meters. */
export const DEFAULT_RADIUS_METERS = 1000;

/** Radius options the user can pick from in Settings. */
export const RADIUS_OPTIONS_METERS = [500, 1000, 5000];

/**
 * A user's location is considered "stale" (and excluded from Radar results)
 * if it was not updated within this many minutes.
 */
export const LOCATION_FRESHNESS_MINUTES = 15;

/** Maximum number of nearby users returned by the Radar query. */
export const MAX_NEARBY_RESULTS = 50;

/** Buckets used to round exact distances into privacy-safe approximations. */
export const DISTANCE_BUCKETS_METERS = [50, 100, 250, 400, 700, 1000, 2500, 5000];

export const APP_NAME = 'Insta Locator';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export const STORAGE_AVATAR_BUCKET = 'avatars';

