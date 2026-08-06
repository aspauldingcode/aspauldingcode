import EmbedViewer from '@/components/EmbedViewer';
import { parseViewTarget } from '@/lib/viewHref';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}): Promise<Metadata> {
  const { u } = await searchParams;
  const target = parseViewTarget(u);
  if (!target) return { title: 'View', robots: { index: false, follow: false } };
  // Proxy/preview panes should not compete with real profile URLs in search.
  return {
    title: target.label,
    description: `In-portfolio preview of ${target.label}`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ViewPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const target = parseViewTarget(u);
  if (!target) notFound();

  return <EmbedViewer target={target} />;
}
