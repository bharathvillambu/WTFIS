import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/types/notification';

/** In-app notifications inbox — server auto-hides rows older than 1 hour via TTL. */
export async function listNotifications(): Promise<{
  data: AppNotification[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_notifications');
  if (error) return { data: [], error: error.message };
  return { data: (data as AppNotification[]) ?? [], error: null };
}

export async function markAllNotificationsRead(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) return { error: error.message };
  return { error: null };
}

/** Register an Expo push token for this user (server -> edge function -> Expo push). */
export async function upsertPushToken(
  token: string,
  platform?: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('upsert_push_token', {
    new_token: token,
    new_platform: platform ?? null,
  });
  if (error) return { error: error.message };
  return { error: null };
}

