import { useCallback, useState } from 'react';
import { getNearbyUsers, updateMyLocation } from '@/lib/nearbyUsers';
import { getCurrentLocation } from '@/lib/location';
import { DEFAULT_RADIUS_METERS } from '@/constants/config';
import type { NearbyUser, NearbyUserFilters } from '@/types/user';

interface UseNearbyUsersState {
  users: NearbyUser[];
  loading: boolean;
  error: string | null;
  /** Full refresh cycle: get location -> push it -> query nearby users. */
  refresh: (radiusMeters?: number, filters?: NearbyUserFilters) => Promise<void>;
}

/**
 * Drives the Radar refresh cycle described in the spec:
 * 1. Get current location.
 * 2. Update the user's stored location.
 * 3. Query nearby users via the secure RPC.
 *
 * This is only ever called explicitly (on screen focus / manual refresh),
 * never on an interval or background timer.
 */
export function useNearbyUsers(): UseNearbyUsersState {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (radiusMeters: number = DEFAULT_RADIUS_METERS, filters: NearbyUserFilters = {}) => {
      setLoading(true);
      setError(null);

      const locationResult = await getCurrentLocation();
      if (locationResult.error || !locationResult.coords) {
        setLoading(false);
        setError(mapLocationError(locationResult.error));
        return;
      }

      const { error: updateError } = await updateMyLocation(locationResult.coords);
      if (updateError) {
        setLoading(false);
        setError(updateError);
        return;
      }

      const { data, error: queryError } = await getNearbyUsers(
        locationResult.coords,
        radiusMeters,
        filters
      );
      setLoading(false);

      if (queryError) {
        setError(queryError);
        return;
      }

      setUsers(data);
    },
    []
  );

  return { users, loading, error, refresh };
}

function mapLocationError(err: string | null): string {
  switch (err) {
    case 'permission-denied':
      return 'Location permission was denied. Enable it in Settings to use Radar.';
    case 'services-disabled':
      return 'Location services are turned off. Enable them to use Radar.';
    case 'timeout':
      return 'Could not get your location in time. Please try again.';
    default:
      return 'Something went wrong getting your location. Please try again.';
  }
}

