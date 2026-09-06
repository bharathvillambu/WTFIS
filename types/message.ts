export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;   // ISO
  expires_at: string;   // ISO (created_at + 5m)
  /** ISO timestamp when the recipient marked this message as read, or null. */
  read_at: string | null;
}

export interface ConversationSummary {
  other_user_id: string;
  other_username: string | null;
  other_avatar_url: string | null;
  last_body: string;
  last_at: string;
  other_is_online?: boolean;
  /** True if the most recent message was sent by me. */
  last_is_mine?: boolean;
  /** If `last_is_mine`, the ISO time the other user read it (or null). */
  last_read_at?: string | null;
  /** Number of messages from the other user that I haven't read yet. */
  unread_count?: number;
}

export interface FavoriteUser {
  id: string;
  instagram_username: string;
  instagram_url: string;
  avatar_url: string | null;
  gender: string | null;
  age: number | null;
  city: string | null;
  favorited_at: string;
  is_online?: boolean;
}

export interface CityUser {
  id: string;
  instagram_username: string;
  instagram_url: string;
  avatar_url: string | null;
  gender: string | null;
  age: number | null;
  city: string | null;
  is_online?: boolean;
}

