import { supabase } from '@/lib/supabase';
import { STORAGE_AVATAR_BUCKET } from '@/constants/config';
import type { Profile } from '@/types/user';

export async function getMyProfile(): Promise<{ data: Profile | null; error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { data: null, error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as Profile | null, error: null };
}

export interface UpsertProfileInput {
  display_name?: string | null;
  instagram_username: string;
  instagram_url: string;
  avatar_url?: string | null;
  gender?: string | null;
  birth_date?: string | null;
}

export async function upsertMyProfile(
  input: UpsertProfileInput
): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Not authenticated.' };

  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: input.display_name ?? null,
    instagram_username: input.instagram_username,
    instagram_url: input.instagram_url,
    avatar_url: input.avatar_url ?? null,
    gender: input.gender ?? null,
    birth_date: input.birth_date ?? null,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function setRadarVisibility(
  visible: boolean
): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Not authenticated.' };

  const { error } = await supabase
    .from('profiles')
    .update({ visible_on_radar: visible })
    .eq('id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

/** Uploads a local image file to the user's own avatar slot in Storage. */
export async function uploadAvatar(
  localUri: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { url: null, error: 'Not authenticated.' };

    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_AVATAR_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from(STORAGE_AVATAR_BUCKET).getPublicUrl(path);
    // Cache-bust so the new avatar shows immediately.
    const url = `${data.publicUrl}?t=${Date.now()}`;
    return { url, error: null };
  } catch (e) {
    return { url: null, error: 'Failed to upload avatar. Please try again.' };
  }
}

/** Deletes the current user's profile row, avatar, and auth account. */
export async function deleteMyAccount(): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Not authenticated.' };

  // Best-effort avatar cleanup; ignore failure if no file exists.
  await supabase.storage.from(STORAGE_AVATAR_BUCKET).remove([`${userId}/avatar.jpg`]);

  const { error: rpcError } = await supabase.rpc('delete_my_account');
  if (rpcError) return { error: rpcError.message };

  await supabase.auth.signOut();
  return { error: null };
}

