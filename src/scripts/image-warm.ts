import {
  connectionBudget,
  enqueueImages,
  warmPlan,
} from '@/lib/prefetchImages';

type WarmProject = { slug: string; images: string[] };

function hints() {
  if (typeof navigator === 'undefined') return {};
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return {
    saveData: conn?.saveData,
    effectiveType: conn?.effectiveType,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
  };
}

/** Heroes decode first. Remaining slides fill HTTP cache. Hover jumps that
 *  project to the front. Save-data / 2g stay idle until pointer intent. */
export function bootImageWarm(projects: WarmProject[]) {
  const bySlug = new Map(projects.map((p) => [p.slug, p.images] as const));

  const warmSlug = (slug: string, urgent: boolean) => {
    const images = bySlug.get(slug);
    if (!images?.length) return;
    enqueueImages(images.slice(0, 1), { decode: true, urgent });
    enqueueImages(images.slice(1), { decode: false, urgent });
  };

  const onIntent = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a[href^="/work/"]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const slug = anchor.pathname.replace(/^\/work\//, '').split('/')[0];
    if (slug) warmSlug(slug, true);
  };

  document.addEventListener('pointerover', onIntent, { passive: true });
  document.addEventListener('focusin', onIntent, { passive: true });

  const warmIdle = () => {
    const plan = warmPlan(projects, connectionBudget(hints()));
    enqueueImages(plan.decode, { decode: true });
    enqueueImages(plan.cache, { decode: false });
  };

  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    ric(warmIdle, { timeout: 800 });
  } else {
    window.setTimeout(warmIdle, 250);
  }
}
