import type { APIRoute } from 'astro';
import { validateUrl } from 'linkpeek';
import { json } from '@/lib/http';
import { shouldProxyPreviewImage } from '@/lib/linkPreviewImage';

export const prerender = false;

const MAX_BYTES = 2_500_000;

/**
 * Same-origin image proxy for CDNs that block hotlinking (esp. LinkedIn).
 * GET /api/preview-image?u=https://media.licdn.com/...
 */
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
    validateUrl(href, false);
  } catch {
    return json({ error: 'invalid url' }, 400);
  }

  if (!shouldProxyPreviewImage(href)) {
    return json({ error: 'host not allowed' }, 403);
  }

  try {
    const upstream = await fetch(href, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        Referer: 'https://www.linkedin.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok || !upstream.body) {
      return json({ error: 'upstream failed' }, 502);
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return json({ error: 'not an image' }, 502);
    }

    const len = Number(upstream.headers.get('content-length') || 0);
    if (len > MAX_BYTES) {
      return json({ error: 'too large' }, 502);
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return json({ error: 'too large' }, 502);
    }

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'Content-Length': String(buf.byteLength),
      },
    });
  } catch {
    return json({ error: 'fetch failed' }, 502);
  }
};
