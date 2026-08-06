'use client';

import ContributionGraph from '@/components/ContributionGraph';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type EdgeState = {
  /** True when the graph is wider than the viewport in scroll layout. */
  overflows: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

const IDLE: EdgeState = {
  overflows: false,
  canScrollLeft: false,
  canScrollRight: false,
};

/**
 * Scroll detail (default) vs fit-to-width full graph.
 * Toggle and edge fades only appear when the graph actually overflows.
 */
export default function ContributionGraphPanel({ href }: { href: string }) {
  const [preferFit, setPreferFit] = useState(false);
  const [edges, setEdges] = useState<EdgeState>(IDLE);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const isFit = preferFit && edges.overflows;
  const mode = isFit ? 'fit' : 'scroll';

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const svg = scroller.querySelector('svg.github-graph');
    const natural = svg
      ? Number(svg.getAttribute('width')) || svg.getBoundingClientRect().width
      : 0;
    const view = scroller.clientWidth;
    const naturalOverflow = natural > view + 1;

    // While fitted, SVG is width:100% so scroll metrics won't show overflow.
    if (preferFit) {
      setEdges({
        overflows: naturalOverflow,
        canScrollLeft: false,
        canScrollRight: false,
      });
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    setEdges({
      overflows: scrollWidth > clientWidth + 1 || naturalOverflow,
      canScrollLeft: scrollLeft > 1,
      canScrollRight: scrollLeft + clientWidth < scrollWidth - 1,
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
    const svg = scroller.querySelector('svg.github-graph');
    if (svg) ro.observe(svg);

    window.addEventListener('resize', run);
    return () => {
      scroller.removeEventListener('scroll', run);
      ro.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [measure, preferFit]);

  return (
    <div className="github-graph-panel">
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
