const INSTAGRAM_URL_REGEX =
  /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]{1,30})\/?(\?.*)?$/;

/**
 * Very permissive URL check used only for the "Open Instagram" button URL.
 * We intentionally do NOT restrict this to instagram.com — the field is a
 * generic profile link the user fully controls (per product decision to
 * drop strict Instagram validation).
 */
const GENERIC_URL_REGEX = /^https?:\/\/.+/i;

/** Validates that a string looks like a real Instagram profile URL. */
export function isValidInstagramUrl(url: string): boolean {
  if (!url) return false;
  return GENERIC_URL_REGEX.test(url.trim());
}

/**
 * Username is now a free-form, user-chosen display handle with no format
 * restrictions — always considered valid as long as it's not empty.
 */
export function isValidInstagramUsername(username: string): boolean {
  return username.trim().length > 0;
}

/** Strips a leading "@" and whitespace from a username input. */
export function normalizeInstagramUsername(username: string): string {
  return username.replace(/^@/, '').trim();
}

/** Builds a best-guess Instagram profile URL from a username (editable by the user afterwards). */
export function buildInstagramUrl(username: string): string {
  return `https://www.instagram.com/${normalizeInstagramUsername(username)}/`;
}

/** Extracts a username from a full Instagram profile URL, if possible. */
export function extractInstagramUsername(url: string): string | null {
  const match = url.trim().match(INSTAGRAM_URL_REGEX);
  return match ? match[2] : null;
}

/** Computes whole-number age from an ISO `YYYY-MM-DD` birth date string. */
export function calculateAge(birthDateIso: string): number {
  const birth = new Date(birthDateIso);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/** Formats a Date as an ISO `YYYY-MM-DD` string (no time component). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}


