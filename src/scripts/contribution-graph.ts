import { renderContributionSvg, type ContribData } from '@/lib/contributionGraph';

type EdgeState = {
  overflows: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

const IDLE: EdgeState = {
  overflows: false,
  canScrollLeft: false,
  canScrollRight: false,
};

const EPS = 2;
const FIT = '󰍽';
const SCROLL = '󰘖';

function scrollMinPx(el: Element): number {
  const raw =
    getComputedStyle(el).getPropertyValue('--github-graph-min').trim() || '37.5rem';
  if (raw.endsWith('rem')) {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parseFloat(raw) * rem;
  }
  if (raw.endsWith('px')) return parseFloat(raw);
  return parseFloat(raw) || 600;
}

function bindPanel(panel: HTMLElement) {
  const scroller = panel.querySelector<HTMLElement>('.github-graph-scroller');
  const wrap = panel.querySelector<HTMLElement>('.github-graph-scroll-wrap');
  const toolbar = panel.querySelector<HTMLElement>('.github-graph-toolbar');
  const toggle = panel.querySelector<HTMLButtonElement>('.github-graph-toggle');
  const icon = toggle?.querySelector<HTMLElement>('.nf');
  const label = toggle?.querySelector<HTMLElement>('[data-graph-label]');
  const link = panel.querySelector<HTMLElement>('.github-graph-link');
  if (!scroller || !wrap || !toolbar || !toggle || !icon || !label || !link) return;

  let preferFit = false;
  let edges: EdgeState = IDLE;

  const isFit = () => preferFit && edges.overflows;

  function paint() {
    const fit = isFit();
    wrap.dataset.mode = fit ? 'fit' : 'scroll';
    wrap.dataset.fadeLeft = edges.canScrollLeft ? '1' : '0';
    wrap.dataset.fadeRight = edges.canScrollRight ? '1' : '0';
    toolbar.hidden = !edges.overflows;
    toggle.setAttribute('aria-pressed', fit ? 'true' : 'false');
    icon.textContent = fit ? FIT : SCROLL;
    label.textContent = fit ? 'Scroll left/right' : 'Show entire graph';
  }

  function measure() {
    const view = scroller.clientWidth;
    const wouldOverflow = view + EPS < scrollMinPx(panel);

    if (preferFit) {
      edges = {
        overflows: wouldOverflow,
        canScrollLeft: false,
        canScrollRight: false,
      };
      paint();
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    const overflows = scrollWidth > clientWidth + EPS;
    edges = {
      overflows,
      canScrollLeft: overflows && scrollLeft > EPS,
      canScrollRight: overflows && scrollLeft + clientWidth < scrollWidth - EPS,
    };
    paint();
  }

  toggle.addEventListener('click', () => {
    preferFit = !preferFit;
    measure();
  });

  const run = () => {
    queueMicrotask(measure);
  };
  run();
  scroller.addEventListener('scroll', run, { passive: true });
  const ro = new ResizeObserver(run);
  ro.observe(scroller);
  window.addEventListener('resize', run);

  return { link, measure };
}

async function loadYears(link: HTMLElement) {
  if (link.dataset.graphFull === '1') return;
  try {
    const res = await fetch('/github/contributions.json');
    if (!res.ok) return;
    const graph = (await res.json()) as ContribData;
    if (!graph.years?.length) {
      link.dataset.graphFull = '1';
      return;
    }
    const hasSvg = Boolean(link.querySelector('svg'));
    if (hasSvg && graph.years.length <= 1) {
      link.dataset.graphFull = '1';
      return;
    }
    link.innerHTML = renderContributionSvg(graph, graph.years);
    link.dataset.graphFull = '1';
  } catch {
    /* keep the current-year band when present */
  }
}

export function bootContributionGraph() {
  const panel = document.querySelector<HTMLElement>('[data-graph-panel]');
  if (!panel || panel.dataset.graphBooted === '1') return;
  panel.dataset.graphBooted = '1';
  const bound = bindPanel(panel);
  if (!bound) return;

  const fill = () => {
    void loadYears(bound.link).then(() => bound.measure());
  };
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    ric(fill, { timeout: 2000 });
  } else {
    window.setTimeout(fill, 200);
  }
}
