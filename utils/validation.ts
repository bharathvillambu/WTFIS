const INSTAGRAM_URL_REGEX =
  /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]{1,30})\/?(\?.*)?$/;

const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

const RESERVED_PATH_SEGMENTS = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'accounts',
  'direct',
  'tv',
]);

/** Validates that a string looks like a real Instagram profile URL. */
export function isValidInstagramUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  const match = trimmed.match(INSTAGRAM_URL_REGEX);
  if (!match) return false;
  const username = match[2].toLowerCase();
  return !RESERVED_PATH_SEGMENTS.has(username);
}

/** Validates a bare Instagram username (without the @). */
export function isValidInstagramUsername(username: string): boolean {
  if (!username) return false;
  const cleaned = username.replace(/^@/, '').trim();
  return INSTAGRAM_USERNAME_REGEX.test(cleaned) && !RESERVED_PATH_SEGMENTS.has(cleaned.toLowerCase());
}

/** Strips a leading "@" and whitespace from a username input. */
export function normalizeInstagramUsername(username: string): string {
  return username.replace(/^@/, '').trim();
}

/** Builds a canonical Instagram profile URL from a username. */
export function buildInstagramUrl(username: string): string {
  return `https://www.instagram.com/${normalizeInstagramUsername(username)}/`;
}

/** Extracts a username from a full Instagram profile URL, if possible. */
export function extractInstagramUsername(url: string): string | null {
  const match = url.trim().match(INSTAGRAM_URL_REGEX);
  return match ? match[2] : null;
}

