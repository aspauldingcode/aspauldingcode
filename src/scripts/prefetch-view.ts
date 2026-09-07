import { prefetchLinkPreview } from '@/lib/prefetchLinkPreview';

/** Warm /api/preview on pointerenter/focus for a[data-prefetch-view]. */
export function bootPrefetchView() {
  const warm = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a[data-prefetch-view]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const href = anchor.dataset.prefetchView || '';
    if (href.startsWith('https://')) prefetchLinkPreview(href);
  };

  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm, { passive: true });
}
