import { supabase } from '@/lib/supabase';

/**
 * Ping the server to mark the current user as "online now". Cheap RPC,
 * safe to call opportunistically (app start, focus, every ~60s).
 */
export async function pingPresence(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('touch_presence');
  return { error: error?.message ?? null };
}

