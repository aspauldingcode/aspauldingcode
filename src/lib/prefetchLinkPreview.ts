/** Warm /api/preview so the right-column card is often ready on click. */

const warmed = new Set<string>();

export function prefetchLinkPreview(href: string): void {
  if (typeof window === 'undefined') return;
  if (!href.startsWith('https://')) return;
  if (warmed.has(href)) return;
  warmed.add(href);

  const url = `/api/preview?u=${encodeURIComponent(href)}`;
  try {
    if (typeof window.fetch === 'function') {
      void fetch(url, {
        priority: 'low',
        keepalive: true,
      } as RequestInit).catch(() => {
        warmed.delete(href);
      });
      return;
    }
  } catch {
    warmed.delete(href);
  }
}
