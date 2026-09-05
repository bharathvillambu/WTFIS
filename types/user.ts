/** A row from the `profiles` table, as owned/seen by the authenticated user. */
export interface Profile {
  id: string;
  display_name: string | null;
  instagram_username: string | null;
  instagram_url: string | null;
  avatar_url: string | null;
  gender: string | null;
  birth_date: string | null;
  visible_on_radar: boolean;
  location_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A nearby user as returned by the `get_nearby_users` RPC.
 * Deliberately excludes exact coordinates and any PII beyond what the
 * user has voluntarily made public for Radar. Note: only a derived `age`
 * is returned server-side, never the raw `birth_date`.
 */
export interface NearbyUser {
  id: string;
  instagram_username: string;
  instagram_url: string;
  avatar_url: string | null;
  gender: string | null;
  age: number | null;
  distance_meters: number;
}

/** Optional server-side filters accepted by `get_nearby_users`. */
export interface NearbyUserFilters {
  gender?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}



