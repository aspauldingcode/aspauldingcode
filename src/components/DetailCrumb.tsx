'use client';

import { Fragment } from 'react';
import type { CrumbItem } from '@/lib/detailTrail';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';

function hashFromHref(href: string): string | null {
  if (href.startsWith('/#')) return href.slice(2);
  if (href.startsWith('#')) return href.slice(1);
  try {
    const u = new URL(href, 'https://example.invalid');
    return u.hash ? u.hash.slice(1) : null;
  } catch {
    return null;
  }
}

/** Shared detail-pane breadcrumb: Section / Current */
export default function DetailCrumb({ items }: { items: CrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav className="crumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 ? (
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
            ) : null}
            {last || !item.href ? (
              <span aria-current={last ? 'page' : undefined}>{item.label}</span>
            ) : (
              <a
                href={item.href}
                onClick={() => {
                  const hash = hashFromHref(item.href!);
                  if (hash) scheduleScrollToHomeSection(hash);
                }}
              >
                {item.label}
              </a>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
