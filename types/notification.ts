export type NotificationKind = 'message' | 'like' | 'favorite';

export interface AppNotification {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_avatar_url: string | null;
  kind: NotificationKind;
  body: string | null;
  created_at: string;   // ISO
  expires_at: string;   // ISO (created_at + 1h)
  read_at: string | null;
}

