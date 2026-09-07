/** Connection-aware image cache warm. Parked work panes are display:none, so
 *  DOM <img>.decode() does not fetch. Warm with off-DOM Image() instead. */

export type WarmBudget = {
  decodeHeroes: boolean;
  cacheRest: boolean;
  concurrency: number;
};

export type WarmHints = {
  saveData?: boolean;
  effectiveType?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

type Job = { src: string; decode: boolean };

const queued = new Map<string, Job>();
const order: string[] = [];
const cached = new Set<string>();
const decoded = new Set<string>();
let running = 0;
let pumping = false;

function navHints(): WarmHints {
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

export function connectionBudget(hints: WarmHints = {}): WarmBudget {
  const type = hints.effectiveType ?? '';
  if (hints.saveData || type === 'slow-2g' || type === '2g') {
    return { decodeHeroes: false, cacheRest: false, concurrency: 1 };
  }
  const cores = hints.hardwareConcurrency ?? 4;
  const mem = hints.deviceMemory;
  const tight = cores <= 2 || (typeof mem === 'number' && mem <= 2);
  if (type === '3g' || tight) {
    return { decodeHeroes: true, cacheRest: true, concurrency: 1 };
  }
  return { decodeHeroes: true, cacheRest: true, concurrency: 2 };
}

export function canPrefetch(): boolean {
  const budget = connectionBudget(navHints());
  return budget.decodeHeroes || budget.cacheRest;
}

/** First slide of each project, then every other unique src. */
export function warmPlan(
  projects: { images: string[] }[],
  budget: WarmBudget
): { decode: string[]; cache: string[] } {
  const decode: string[] = [];
  const cache: string[] = [];
  const seen = new Set<string>();
  for (const project of projects) {
    const hero = project.images[0];
    if (!hero || seen.has(hero)) continue;
    seen.add(hero);
    if (budget.decodeHeroes) decode.push(hero);
    else if (budget.cacheRest) cache.push(hero);
  }
  if (budget.cacheRest) {
    for (const project of projects) {
      for (const src of project.images.slice(1)) {
        if (!src || seen.has(src)) continue;
        seen.add(src);
        cache.push(src);
      }
    }
  }
  return { decode, cache };
}

export function paneImageSrcs(root: ParentNode): string[] {
  const srcs: string[] = [];
  const seen = new Set<string>();
  root.querySelectorAll('img').forEach((img) => {
    const src = img.currentSrc || img.getAttribute('src') || '';
    if (!src || seen.has(src)) return;
    seen.add(src);
    srcs.push(src);
  });
  return srcs;
}

function remember(src: string, job: Job, urgent: boolean) {
  const already = queued.get(src);
  if (decoded.has(src)) return;
  if (!job.decode && cached.has(src)) return;
  if (already) {
    if (job.decode) already.decode = true;
    if (urgent) {
      const i = order.indexOf(src);
      if (i > 0) {
        order.splice(i, 1);
        order.unshift(src);
      }
    }
    return;
  }
  queued.set(src, job);
  if (urgent) order.unshift(src);
  else order.push(src);
}

export function enqueueImages(
  srcs: string[],
  opts: { decode?: boolean; urgent?: boolean } = {}
): void {
  if (typeof window === 'undefined') return;
  const decode = Boolean(opts.decode);
  const urgent = Boolean(opts.urgent);
  for (const src of srcs) {
    if (!src) continue;
    remember(src, { src, decode }, urgent);
  }
  pump();
}

/** Same-origin image cache. Widths are unused; public AVIFs are already sized. */
export function prefetchImages(srcs: string[]): void {
  enqueueImages(srcs, { decode: false });
}

function pump() {
  if (pumping || typeof window === 'undefined') return;
  pumping = true;
  const run = () => {
    const n = connectionBudget(navHints()).concurrency;
    while (running < n && order.length) {
      const src = order.shift();
      if (!src) break;
      const job = queued.get(src);
      queued.delete(src);
      if (!job) continue;
      if (decoded.has(src) || (!job.decode && cached.has(src))) continue;
      running += 1;
      void runJob(job).finally(() => {
        running -= 1;
        schedulePump();
      });
    }
    pumping = false;
    if (order.length && running < connectionBudget(navHints()).concurrency) {
      schedulePump();
    }
  };
  run();
}

function schedulePump() {
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') ric(() => pump(), { timeout: 400 });
  else window.setTimeout(() => pump(), 0);
}

async function runJob(job: Job): Promise<void> {
  if (job.decode) {
    await decodeSrc(job.src);
    cached.add(job.src);
    decoded.add(job.src);
    return;
  }
  await cacheSrc(job.src);
  cached.add(job.src);
}

function decodeSrc(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.decoding = 'async';
    const done = () => resolve();
    img.onload = () => {
      void img.decode?.().catch(() => undefined).then(done);
    };
    img.onerror = done;
    img.src = src;
  });
}

function cacheSrc(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}
