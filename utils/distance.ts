import { DISTANCE_BUCKETS_METERS } from '@/constants/config';

/**
 * Rounds a precise distance (in meters) up to the nearest privacy-safe
 * bucket, e.g. 137 -> "~250m". This is also computed server-side by the
 * `get_nearby_users` RPC, but we re-round on the client defensively in
 * case raw distances are ever passed through.
 */
export function formatApproxDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '~???';

  for (const bucket of DISTANCE_BUCKETS_METERS) {
    if (meters <= bucket) {
      return formatBucket(bucket);
    }
  }

  const lastBucket = DISTANCE_BUCKETS_METERS[DISTANCE_BUCKETS_METERS.length - 1];
  return `~${(lastBucket / 1000).toFixed(0)}km+`;
}

function formatBucket(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `~${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)}km`;
  }
  return `~${meters}m`;
}

