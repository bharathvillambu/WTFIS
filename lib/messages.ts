import { supabase } from '@/lib/supabase';
import type { ConversationSummary, DirectMessage } from '@/types/message';

/** Send a 5-minute ephemeral message to another user via the SECURITY DEFINER RPC. */
export async function sendMessage(
  targetUserId: string,
  body: string
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('send_direct_message', {
    target_user_id: targetUserId,
    message_body: body,
  });
  if (error) return { id: null, error: error.message };
  return { id: (data as string) ?? null, error: null };
}

/** Fetch the (non-expired) message thread between me and another user. */
export async function getConversation(
  otherUserId: string,
  limit = 100
): Promise<{ data: DirectMessage[]; error: string | null }> {
  const { data, error } = await supabase.rpc('get_conversation', {
    other_user_id: otherUserId,
    limit_count: limit,
  });
  if (error) return { data: [], error: error.message };
  return { data: (data as DirectMessage[]) ?? [], error: null };
}

/** List all of my recent conversations (one row per counterpart). */
export async function listConversations(): Promise<{
  data: ConversationSummary[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_conversations');
  if (error) return { data: [], error: error.message };
  return { data: (data as ConversationSummary[]) ?? [], error: null };
}

/**
 * Mark all messages from `otherUserId` → me as read. Idempotent; returns the
 * number of messages that were newly marked as read.
 */
export async function markMessagesRead(
  otherUserId: string
): Promise<{ marked: number; error: string | null }> {
  const { data, error } = await supabase.rpc('mark_messages_read', {
    other_user_id: otherUserId,
  });
  if (error) return { marked: 0, error: error.message };
  return { marked: (data as number) ?? 0, error: null };
}

