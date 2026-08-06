'use client';

import ContributionGraph from '@/components/ContributionGraph';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type Mode = 'scroll' | 'fit';

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
  const [mode, setMode] = useState<Mode>('scroll');
  const [edges, setEdges] = useState<EdgeState>(IDLE);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const svg = scroller.querySelector('svg.github-graph');
    const natural = svg
      ? Number(svg.getAttribute('width')) || svg.getBoundingClientRect().width
      : 0;
    const view = scroller.clientWidth;
    const overflows = natural > view + 1;

    if (mode === 'fit') {
      setEdges({
        overflows,
        canScrollLeft: false,
        canScrollRight: false,
      });
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    const canScrollLeft = scrollLeft > 1;
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - 1;
    setEdges({
      overflows: scrollWidth > clientWidth + 1 || overflows,
      canScrollLeft,
      canScrollRight,
    });
  }, [mode]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    measure();
    const onScroll = () => measure();
    scroller.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => measure());
    ro.observe(scroller);
    const svg = scroller.querySelector('svg.github-graph');
    if (svg) ro.observe(svg);

    window.addEventListener('resize', measure);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, mode]);

  // If overflow goes away while in fit, drop back to scroll (no toggle needed).
  useEffect(() => {
    if (mode === 'fit' && !edges.overflows) {
      setMode('scroll');
    }
  }, [mode, edges.overflows]);

  const isFit = mode === 'fit';
  const showToggle = edges.overflows || isFit;

  return (
    <div className="github-graph-panel">
      {showToggle ? (
        <p className="github-graph-toolbar no-print">
          <button
            type="button"
            className="ctrl-link github-graph-toggle"
            onClick={() => setMode(isFit ? 'scroll' : 'fit')}
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
