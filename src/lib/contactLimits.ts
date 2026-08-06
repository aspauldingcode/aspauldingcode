/** Shared contact message limits (safe for client + server). */

export const MIN_MESSAGE_WORDS = 15;
export const MAX_MESSAGE_WORDS = 300;
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_NAME_CHARS = 100;
export const MAX_EMAIL_CHARS = 254;

/** Textarea box height bounds (px). Max sized for ~300-word drafts without dominating the page. */
export const MESSAGE_BOX_MIN_PX = 136; // 8.5rem
export const MESSAGE_BOX_MAX_PX = 420; // ~26rem; scroll inside once taller content

/**
 * Practical email check: local@domain.tld, no spaces, no consecutive dots.
 * Stricter than HTML5 in some browsers (rejects "a@b").
 */
export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!value || value.length > MAX_EMAIL_CHARS) return false;
  if (value.includes('..')) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    value
  );
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function clampMessageBoxHeight(px: number): number {
  return Math.min(MESSAGE_BOX_MAX_PX, Math.max(MESSAGE_BOX_MIN_PX, Math.round(px)));
}

