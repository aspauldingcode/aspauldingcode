/** Next/Image optimizer URL helper + connection-aware cache warming. */

export function nextImageUrl(src: string, width: number, quality = 75): string {
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality),
  });
  return `/_next/image?${params}`;
}

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
export const NEIGHBOR_WIDTHS = [1080] as const;

export function prefetchImages(srcs: string[], opts: PrefetchOpts = {}): void {
  if (typeof window === 'undefined') return;
  const widths = opts.widths ?? HERO_WIDTHS;
  const quality = opts.quality ?? 75;

  for (const src of srcs) {
    if (!src) continue;
    for (const w of widths) {
      const href = nextImageUrl(src, w, quality);
      if (warmed.has(href)) continue;
      warmed.add(href);
      const img = new window.Image();
      img.decoding = 'async';
      img.src = href;
    }
  }
}

/** Always-safe tiny preview (even on save-data). */
export function prefetchLqip(srcs: string[]): void {
  prefetchImages(srcs, { widths: LQIP_WIDTHS, quality: 20 });
}
