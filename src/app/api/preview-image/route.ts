import { validateUrl } from 'linkpeek';
import { NextRequest, NextResponse } from 'next/server';
import { shouldProxyPreviewImage } from '@/lib/linkPreviewImage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2_500_000;

/**
 * Same-origin image proxy for CDNs that block hotlinking (esp. LinkedIn).
 * GET /api/preview-image?u=https://media.licdn.com/...
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('u');
  if (!raw) {
    return NextResponse.json({ error: 'missing u' }, { status: 400 });
  }

  let href: string;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') {
      return NextResponse.json({ error: 'https only' }, { status: 400 });
    }
    href = u.toString();
    validateUrl(href, false);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  if (!shouldProxyPreviewImage(href)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
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
      return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'not an image' }, { status: 502 });
    }

    const len = Number(upstream.headers.get('content-length') || 0);
    if (len > MAX_BYTES) {
      return NextResponse.json({ error: 'too large' }, { status: 502 });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'too large' }, { status: 502 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'Content-Length': String(buf.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
  }
}
