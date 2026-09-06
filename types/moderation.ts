export interface BlockedUser {
  blocked_id: string;
  instagram_username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type ReportReason =
  | 'Inappropriate content'
  | 'Harassment or bullying'
  | 'Impersonation / fake profile'
  | 'Spam'
  | 'Underage user'
  | 'Other';

export const REPORT_REASONS: ReportReason[] = [
  'Inappropriate content',
  'Harassment or bullying',
  'Impersonation / fake profile',
  'Spam',
  'Underage user',
  'Other',
];

