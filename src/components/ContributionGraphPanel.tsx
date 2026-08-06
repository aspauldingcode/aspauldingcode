'use client';

import ContributionGraph from '@/components/ContributionGraph';
import Link from 'next/link';
import { useState } from 'react';

type Mode = 'scroll' | 'fit';

/**
 * Scroll detail (default) vs fit-to-width full graph.
 * Fit scales the inline SVG so the entire calendar is visible without sideways scroll.
 */
export default function ContributionGraphPanel({ href }: { href: string }) {
  const [mode, setMode] = useState<Mode>('scroll');
  const isFit = mode === 'fit';

  return (
    <div className="github-graph-panel">
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

      <div className="github-graph-scroll-wrap" data-mode={mode}>
        <div className="github-graph-scroller">
          <Link className="github-graph-link" href={href}>
            <ContributionGraph />
          </Link>
        </div>
      </div>
    </div>
  );
}
