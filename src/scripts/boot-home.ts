import { bootContributionGraph } from '@/scripts/contribution-graph';
import { bootHireMe } from '@/scripts/hire-me';
import { bootImageWarm } from '@/scripts/image-warm';
import { bootPrefetchView } from '@/scripts/prefetch-view';

type WarmProject = { slug: string; images: string[] };

export function readWarmProjects(root: ParentNode = document): WarmProject[] {
  const el =
    root instanceof Document
      ? root.getElementById('image-warm-data')
      : root.querySelector('#image-warm-data');
  if (!el?.textContent) return [];
  try {
    const parsed = JSON.parse(el.textContent) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is WarmProject => {
      return (
        Boolean(row) &&
        typeof row === 'object' &&
        typeof (row as WarmProject).slug === 'string' &&
        Array.isArray((row as WarmProject).images)
      );
    });
  } catch {
    return [];
  }
}

function idle(fn: () => void) {
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') ric(fn, { timeout: 1500 });
  else window.setTimeout(fn, 250);
}

function workSlugFromAnchor(anchor: HTMLAnchorElement): string | null {
  const parts = anchor.pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[0] !== 'work') return null;
  const slug = parts[1] ?? '';
  return /^[a-z0-9-]+$/.test(slug) ? slug : null;
}

function bootWorkRouteLazy() {
  let started = false;
  let queued:
    | { kind: 'work'; slug: string }
    | { kind: 'view'; href: string }
    | null = null;
  const load = () => {
    if (started) return;
    started = true;
    void import('@/scripts/work-route').then((m) => {
      document.removeEventListener('pointerover', onIntent);
      document.removeEventListener('pointerdown', onIntent);
      document.removeEventListener('click', onClick, true);
      m.bootWorkRoute();
      if (queued?.kind === 'work') m.openPreparedWork(queued.slug, true);
      if (queued?.kind === 'view') m.openPreparedView(queued.href, true);
    });
  };
  const onIntent = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const work = target.closest('a[href^="/work/"]');
    if (work instanceof HTMLAnchorElement) {
      const slug = workSlugFromAnchor(work);
      if (slug) void fetch(`/work/${slug}`);
      load();
      return;
    }
    const view = target.closest('a[href^="/view"]');
    if (view instanceof HTMLAnchorElement) load();
  };
  const onClick = (event: Event) => {
    if (!(event instanceof MouseEvent) || event.button !== 0 || event.metaKey || event.ctrlKey) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const work = target.closest('a[href^="/work/"]');
    if (work instanceof HTMLAnchorElement && work.target !== '_blank') {
      const slug = workSlugFromAnchor(work);
      if (!slug) return;
      event.preventDefault();
      queued = { kind: 'work', slug };
      void fetch(`/work/${slug}`);
      load();
      return;
    }
    const view = target.closest('a[href^="/view"]');
    if (view instanceof HTMLAnchorElement && view.target !== '_blank') {
      event.preventDefault();
      queued = { kind: 'view', href: view.href };
      load();
    }
  };
  document.addEventListener('pointerover', onIntent, { passive: true });
  document.addEventListener('pointerdown', onIntent, { passive: true });
  document.addEventListener('click', onClick, true);
  idle(load);
}

export function bootHome(root: ParentNode = document) {
  bootHireMe();
  bootPrefetchView();
  bootImageWarm(readWarmProjects(root));
  bootContributionGraph();
  bootWorkRouteLazy();
}
