import { fetchLinkPreview } from '@/lib/linkPreview';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/preview?u=https://… — Open Graph / Twitter Card unfurl. */
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
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const data = await fetchLinkPreview(href);
  if (!data) {
    return NextResponse.json({ error: 'preview unavailable' }, { status: 502 });
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
