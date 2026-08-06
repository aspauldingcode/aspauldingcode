'use client';

import Link from 'next/link';
import { viewHref } from '@/lib/viewHref';
import { prefetchLinkPreview } from '@/lib/prefetchLinkPreview';

/** Profile link that warms /api/preview on hover/focus before navigation. */
export default function PrefetchViewLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const warm = () => {
    if (href.startsWith('https://')) prefetchLinkPreview(href);
  };

  return (
    <Link
      href={viewHref(href)}
      onPointerEnter={warm}
      onFocus={warm}
    >
      {children}
    </Link>
  );
}
