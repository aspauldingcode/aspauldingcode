/** Stable URL hash / DOM id from a visible title ("Selected work" → "selected-work"). */
export function sectionId(label: unknown): string {
  return String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
