import { supabase } from '@/lib/supabase';
import type { CityUser } from '@/types/message';

export async function listUsersByCity(
  city: string,
  filters: { gender?: string | null; minAge?: number | null; maxAge?: number | null } = {},
  limit = 50
): Promise<{ data: CityUser[]; error: string | null }> {
  const { data, error } = await supabase.rpc('list_users_by_city', {
    city_filter: city,
    gender_filter: filters.gender ?? null,
    min_age: filters.minAge ?? null,
    max_age: filters.maxAge ?? null,
    limit_count: limit,
  });
  if (error) return { data: [], error: error.message };
  return { data: (data as CityUser[]) ?? [], error: null };
}

