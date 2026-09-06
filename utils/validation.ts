const INSTAGRAM_URL_REGEX =
  /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]{1,30})\/?(\?.*)?$/;

/**
 * Very permissive URL check used only for the "Open Instagram" button URL.
 * We intentionally do NOT restrict this to instagram.com — the field is a
 * generic profile link the user fully controls.
 */
const GENERIC_URL_REGEX = /^https?:\/\/.+/i;

/** Strips a leading "@" and whitespace from a username input. */
export function normalizeInstagramUsername(username: string): string {
  return username.replace(/^@/, '').trim();
}

/** Builds a best-guess Instagram profile URL from a username. */
export function buildInstagramUrl(username: string): string {
  return `https://www.instagram.com/${normalizeInstagramUsername(username)}/`;
}

/** Extracts a username from a full Instagram profile URL, if possible. */
export function extractInstagramUsername(url: string): string | null {
  const match = url.trim().match(INSTAGRAM_URL_REGEX);
  return match?.[2] ?? null;
}

/** Returns whether a user-supplied link is a usable absolute HTTP(S) URL. */
export function isValidProfileLink(url: string): boolean {
  return GENERIC_URL_REGEX.test(url.trim());
}

/**
 * Normalizes whatever the user stored as their "profile link" into an
 * openable absolute URL:
 * - Already a full `http(s)://...` URL -> returned as-is (trimmed).
 * - A bare handle like `0rion_pax_99` or `@0rion_pax_99` -> expanded into
 *   `https://www.instagram.com/0rion_pax_99/`.
 * - A domain without a scheme (e.g. `instagram.com/foo`) -> `https://` is
 *   prepended so `Linking.openURL` doesn't reject it.
 */
export function normalizeProfileLink(rawUrl: string): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.|.*\.[a-z]{2,}(\/|$))/i.test(trimmed)) return `https://${trimmed}`;
  return buildInstagramUrl(trimmed);
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
