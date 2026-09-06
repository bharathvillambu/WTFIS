import { supabase } from '@/lib/supabase';
import type { CityUser } from '@/types/message';

/**
 * Search visible users by Instagram username (case-insensitive). Matches
 * prefixes first, then substrings. Returns up to `limit` results and
 * excludes the caller. Returns the `CityUser` shape because it already
 * contains all fields the results list needs (username, url, avatar,
 * gender, age, city, online).
 */
export async function searchUsersByUsername(
  query: string,
  limit = 30
): Promise<{ data: CityUser[]; error: string | null }> {
  const q = query.trim();
  if (!q) return { data: [], error: null };
  const { data, error } = await supabase.rpc('search_users_by_username', {
    q,
    limit_count: limit,
  });
  if (error) return { data: [], error: error.message };
  return { data: (data as CityUser[]) ?? [], error: null };
}

