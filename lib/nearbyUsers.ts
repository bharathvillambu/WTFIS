import { supabase } from '@/lib/supabase';
import { DEFAULT_RADIUS_METERS } from '@/constants/config';
import type { Coordinates, NearbyUser } from '@/types/user';

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
 * server-side and returns only privacy-safe fields (no raw coordinates).
 */
export async function getNearbyUsers(
  coords: Coordinates,
  radiusMeters: number = DEFAULT_RADIUS_METERS
): Promise<{ data: NearbyUser[]; error: string | null }> {
  const { data, error } = await supabase.rpc('get_nearby_users', {
    lat: coords.latitude,
    lng: coords.longitude,
    radius_meters: radiusMeters,
  });

  if (error) return { data: [], error: error.message };
  return { data: (data as NearbyUser[]) ?? [], error: null };
}

