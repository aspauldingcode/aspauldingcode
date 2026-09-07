'use client';

import { useEffect } from 'react';

/** Shell only. Year bands load after idle so React never bundles the graph data. */
export default function ContributionGraphHost({ href }: { href: string }) {
  useEffect(() => {
    void import('@/scripts/contribution-graph').then((m) => m.bootContributionGraph());
  }, []);

  return (
    <div className="github-graph-panel" data-graph-panel>
      <p className="github-graph-toolbar no-print" hidden>
        <button type="button" className="ctrl-link github-graph-toggle" aria-pressed="false">
          <span className="nf" aria-hidden>
            󰘖
          </span>{' '}
          <span data-graph-label>Show entire graph</span>
        </button>
      </p>
      <div
        className="github-graph-scroll-wrap"
        data-mode="scroll"
        data-fade-left="0"
        data-fade-right="0"
      >
        <div className="github-graph-scroller">
          <a className="github-graph-link" href={href} />
        </div>
      </div>
    </div>
  );
}
