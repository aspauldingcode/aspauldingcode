import type { APIRoute } from 'astro';
import { json } from '@/lib/http';
import { fetchLinkPreview } from '@/lib/linkPreview';

export const prerender = false;

/** GET /api/preview?u=https://... uniform profile card JSON for non-embed links. */
export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get('u');
  if (!raw) {
    return json({ error: 'missing u' }, 400);
  }

  let href: string;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') {
      return json({ error: 'https only' }, 400);
    }
    href = u.toString();
  } catch {
    return json({ error: 'invalid url' }, 400);
  }

  const data = await fetchLinkPreview(href);
  if (!data) {
    return json({ error: 'preview unavailable' }, 502);
  }

  return json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
