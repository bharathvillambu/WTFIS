import { supabase } from '@/lib/supabase';
import type { BlockedUser, ReportReason } from '@/types/moderation';

/** Block a user. Also removes any existing like/favorite between the two. */
export async function blockUser(targetUserId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('block_user', { target_user_id: targetUserId });
  return { error: error?.message ?? null };
}

/** Undo a previous block. Idempotent. */
export async function unblockUser(targetUserId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('unblock_user', { target_user_id: targetUserId });
  return { error: error?.message ?? null };
}

/** Submit a user report. Auto-suspends the reported user after 3 distinct reporters. */
export async function reportUser(
  targetUserId: string,
  reason: ReportReason,
  details?: string,
  context?: string
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('report_user', {
    target_user_id: targetUserId,
    reason,
    details: details ?? null,
    context: context ?? null,
  });
  if (error) return { id: null, error: error.message };
  return { id: (data as string) ?? null, error: null };
}

export async function listMyBlocks(): Promise<{ data: BlockedUser[]; error: string | null }> {
  const { data, error } = await supabase.rpc('list_my_blocks');
  if (error) return { data: [], error: error.message };
  return { data: (data as BlockedUser[]) ?? [], error: null };
}

