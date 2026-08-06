'use client';

import ContributionGraph from '@/components/ContributionGraph';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type EdgeState = {
  /** True when scroll layout actually needs horizontal scrolling. */
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

/**
 * Scroll detail (default) vs fit-to-width full graph.
 * Toggle and edge fades only when the scroller truly overflows.
 */
export default function ContributionGraphPanel({ href }: { href: string }) {
  const [preferFit, setPreferFit] = useState(false);
  const [edges, setEdges] = useState<EdgeState>(IDLE);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isFit = preferFit && edges.overflows;
  const mode = isFit ? 'fit' : 'scroll';

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    const panel = panelRef.current;
    if (!scroller || !panel) return;

    const view = scroller.clientWidth;
    // Fit mode forces width:100%, so use the scroll-mode floor from CSS.
    const wouldOverflow = view + EPS < scrollMinPx(panel);

    if (preferFit) {
      setEdges({
        overflows: wouldOverflow,
        canScrollLeft: false,
        canScrollRight: false,
      });
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    const overflows = scrollWidth > clientWidth + EPS;
    setEdges({
      overflows,
      canScrollLeft: overflows && scrollLeft > EPS,
      canScrollRight: overflows && scrollLeft + clientWidth < scrollWidth - EPS,
    });
  }, [preferFit]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const run = () => {
      queueMicrotask(measure);
    };
    run();
    scroller.addEventListener('scroll', run, { passive: true });

    const ro = new ResizeObserver(run);
    ro.observe(scroller);

    window.addEventListener('resize', run);
    return () => {
      scroller.removeEventListener('scroll', run);
      ro.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [measure, preferFit]);

  return (
    <div className="github-graph-panel" ref={panelRef}>
      {edges.overflows ? (
        <p className="github-graph-toolbar no-print">
          <button
            type="button"
            className="ctrl-link github-graph-toggle"
            onClick={() => setPreferFit((v) => !v)}
            aria-pressed={isFit}
          >
            <span className="nf" aria-hidden>
              {isFit ? '󰁔' : '󰍽'}
            </span>{' '}
            {isFit ? 'Scroll graph' : 'Show entire graph'}
          </button>
        </p>
      ) : null}

      <div
        className="github-graph-scroll-wrap"
        data-mode={mode}
        data-fade-left={edges.canScrollLeft ? '1' : '0'}
        data-fade-right={edges.canScrollRight ? '1' : '0'}
      >
        <div className="github-graph-scroller" ref={scrollerRef}>
          <Link className="github-graph-link" href={href}>
            <ContributionGraph />
          </Link>
        </div>
      </div>
    </div>
  );
}
