'use client';

import { useEffect } from 'react';
import {
  canPrefetch,
  prefetchImages,
  prefetchLqip,
  HERO_WIDTHS,
} from '@/lib/prefetchImages';

type WarmProject = { slug: string; images: string[] };

/**
 * Idle: LQIP for every project hero + full hero when the link allows.
 * Hover/focus: warm that project's first slide (LQIP always, full if allowed).
 */
export default function ImageWarmCache({ projects }: { projects: WarmProject[] }) {
  useEffect(() => {
    const bySlug = new Map(projects.map((p) => [p.slug, p.images] as const));

    const warmSlug = (slug: string) => {
      const images = bySlug.get(slug);
      const hero = images?.[0];
      if (!hero) return;
      prefetchLqip([hero]);
      if (canPrefetch()) prefetchImages([hero], { widths: HERO_WIDTHS });
    };

    const onIntent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href^="/work/"]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const slug = anchor.pathname.replace(/^\/work\//, '').split('/')[0];
      if (slug) warmSlug(slug);
    };

    document.addEventListener('pointerover', onIntent, { passive: true });
    document.addEventListener('focusin', onIntent, { passive: true });

    const warmIdle = () => {
      for (const p of projects) {
        if (!p.images[0]) continue;
        prefetchLqip([p.images[0]]);
        if (canPrefetch()) prefetchImages([p.images[0]], { widths: [640] });
      }
    };

    let idleId = 0;
    let timeoutId = 0;
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      idleId = ric(warmIdle, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(warmIdle, 250);
    }

    return () => {
      document.removeEventListener('pointerover', onIntent);
      document.removeEventListener('focusin', onIntent);
      if (idleId && window.cancelIdleCallback) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [projects]);

  return null;
}
