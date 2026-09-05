import { useCallback, useState } from 'react';
import { getCurrentLocation, LocationError } from '@/lib/location';
import type { Coordinates } from '@/types/user';

interface UseLocationState {
  coords: Coordinates | null;
  loading: boolean;
  error: LocationError | null;
  refresh: () => Promise<Coordinates | null>;
}

/** Fetches a single fresh location fix on demand (no background tracking). */
export function useLocation(): UseLocationState {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getCurrentLocation();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return null;
    }
    setCoords(result.coords);
    return result.coords;
  }, []);

  return { coords, loading, error, refresh };
}

