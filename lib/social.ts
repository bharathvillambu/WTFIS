import { supabase } from '@/lib/supabase';
import type { FavoriteUser } from '@/types/message';

export async function toggleProfileLike(
  targetUserId: string
): Promise<{ liked: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('toggle_profile_like', {
    target_user_id: targetUserId,
  });
  if (error) return { liked: false, error: error.message };
  return { liked: (data as boolean) ?? false, error: null };
}

export async function toggleFavorite(
  targetUserId: string
): Promise<{ favorited: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('toggle_favorite', {
    target_user_id: targetUserId,
  });
  if (error) return { favorited: false, error: error.message };
  return { favorited: (data as boolean) ?? false, error: null };
}

export async function listFavorites(): Promise<{
  data: FavoriteUser[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_favorites');
  if (error) return { data: [], error: error.message };
  return { data: (data as FavoriteUser[]) ?? [], error: null };
}

/** Cheap client-side check: does the current user already like/favorite target? */
export async function getRelationshipFlags(
  targetUserId: string
): Promise<{ liked: boolean; favorited: boolean }> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) return { liked: false, favorited: false };

  const [{ data: like }, { data: fav }] = await Promise.all([
    supabase
      .from('profile_likes')
      .select('liker_id')
      .eq('liker_id', me)
      .eq('liked_user_id', targetUserId)
      .maybeSingle(),
    supabase
      .from('favorites')
      .select('user_id')
      .eq('user_id', me)
      .eq('favorite_user_id', targetUserId)
      .maybeSingle(),
  ]);
  return { liked: !!like, favorited: !!fav };
}

