/** Connection-aware cache warming for public image paths. */

const warmed = new Set<string>();

export function canPrefetch(): boolean {
  if (typeof navigator === 'undefined') return true;
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return false;
  return true;
}

type PrefetchOpts = {
  widths?: readonly number[];
  quality?: number;
};

/** Tiny LQIP frame: enough to recognize layout on slow links. */
export const LQIP_WIDTHS = [48] as const;
export const HERO_WIDTHS = [640, 1080] as const;

export function prefetchImages(srcs: string[], _opts: PrefetchOpts = {}): void {
  if (typeof window === 'undefined') return;

  for (const src of srcs) {
    if (!src) continue;
    if (warmed.has(src)) continue;
    warmed.add(src);
    const img = new window.Image();
    img.decoding = 'async';
    img.src = src;
  }
}

/** Always-safe tiny preview (even on save-data). */
export function prefetchLqip(srcs: string[]): void {
  prefetchImages(srcs);
}
