import { supabase } from '@/lib/supabase';
import { DEFAULT_RADIUS_METERS } from '@/constants/config';
import type { Coordinates, NearbyUser, NearbyUserFilters } from '@/types/user';

/**
 * Pushes the current user's location up to Supabase via the
 * `update_my_location` RPC, which sets both `location` (PostGIS point)
 * and `location_updated_at` server-side.
 */
export async function updateMyLocation(
  coords: Coordinates
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_my_location', {
    lat: coords.latitude,
    lng: coords.longitude,
  });

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Calls the `get_nearby_users` RPC, which performs the PostGIS search
 * server-side and returns only privacy-safe fields (no raw coordinates,
 * no raw birth date — only a derived age). Optional gender/age-range
 * filters are applied server-side when provided.
 */
export async function getNearbyUsers(
  coords: Coordinates,
  radiusMeters: number = DEFAULT_RADIUS_METERS,
  filters: NearbyUserFilters = {}
): Promise<{ data: NearbyUser[]; error: string | null }> {
  const { data, error } = await supabase.rpc('get_nearby_users', {
    lat: coords.latitude,
    lng: coords.longitude,
    radius_meters: radiusMeters,
    gender_filter: filters.gender ?? null,
    min_age: filters.minAge ?? null,
    max_age: filters.maxAge ?? null,
  });

  if (error) return { data: [], error: error.message };
  return { data: (data as NearbyUser[]) ?? [], error: null };
}

