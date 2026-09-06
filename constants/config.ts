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

/** Selectable gender options shown throughout the app. */
export const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

/** Minimum age allowed to create a profile. */
export const MIN_AGE = 18;

/** Maximum age selectable in the radar age-range filter. */
export const MAX_AGE = 80;

/** Default age range used by the Radar filter bar. */
export const DEFAULT_AGE_RANGE: [number, number] = [MIN_AGE, MAX_AGE];

/**
 * Predefined age buckets shown as chips in the Radar filter dropdown.
 * `null` range means "All" (no age filtering).
 */
export const AGE_BUCKETS: { label: string; range: [number, number] | null }[] = [
  { label: 'All ages', range: null },
  { label: '18 - 25', range: [18, 25] },
  { label: '25 - 30', range: [25, 30] },
  { label: '30 - 35', range: [30, 35] },
  { label: '35 - 40', range: [35, 40] },
  { label: '40 - 50', range: [40, 50] },
  { label: '50+', range: [50, MAX_AGE] },
];

/** Page size used when "buffering" the nearby-users list as the user scrolls. */
export const USERS_PAGE_SIZE = 10;

/** How long a chat message stays visible before auto-disappearing. */
export const MESSAGE_TTL_MS = 5 * 60 * 1000;

/** How long an in-app notification stays visible before being auto-hidden. */
export const NOTIFICATION_TTL_MS = 60 * 60 * 1000;

/** Human-readable copy used in the app banners. */
export const MESSAGE_TTL_BANNER = 'Messages are deleted 5 minutes after they are sent.';
export const NOTIFICATION_TTL_BANNER = 'Notifications are cleared automatically every 1 hour.';

