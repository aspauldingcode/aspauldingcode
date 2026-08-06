import EmbedViewer from '@/components/EmbedViewer';
import { fetchLinkPreview } from '@/lib/linkPreview';
import { parseViewTarget } from '@/lib/viewHref';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const target = parseViewTarget(u);
  if (!target) return { title: 'View' };

  if (!target.embeddable) {
    const preview = await fetchLinkPreview(target.openHref);
    if (preview?.title) {
      return { title: `${preview.title} · Alex Spaulding` };
    }
  }

  return { title: `${target.label} · Alex Spaulding` };
}

export default async function ViewPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const target = parseViewTarget(u);
  if (!target) notFound();

  const preview = target.embeddable
    ? null
    : await fetchLinkPreview(target.openHref);

  return <EmbedViewer target={target} preview={preview} />;
}
