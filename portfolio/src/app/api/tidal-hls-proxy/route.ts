import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TIDAL_HOSTNAMES = [
  'sp-pr-cf.audio.tidal.com',
  'sp-ad-cf.audio.tidal.com',
  'sp-pr-ad.audio.tidal.com',
  'cdn.tidal.com',
  'audio.tidal.com',
];

function isAllowedTidalUrl(url: URL): boolean {
  return ALLOWED_TIDAL_HOSTNAMES.some(
    (h) => url.hostname === h || url.hostname.endsWith(`.${h}`)
  );
}

function rewriteManifestSegments(content: string, manifestUrl: string): string {
  let baseUrl: URL | null = null;
  try {
    baseUrl = new URL(manifestUrl);
  } catch {
    /* leave baseUrl null – only absolute segment URLs can be rewritten */
  }

  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      // Resolve relative URLs against the manifest URL when possible.
      let segUrl = trimmed;
      if (baseUrl && !trimmed.startsWith('http')) {
        try {
          segUrl = new URL(trimmed, baseUrl).toString();
        } catch {
          return line;
        }
      }

      try {
        const parsed = new URL(segUrl);
        if (isAllowedTidalUrl(parsed)) {
          return `/api/tidal-hls-proxy?url=${encodeURIComponent(segUrl)}`;
        }
      } catch {
        /* not a valid URL, leave as-is */
      }
      return line;
    })
    .join('\n');
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  if (!isAllowedTidalUrl(targetUrl)) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  const upstream = await fetch(targetUrl.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 TidalPlayer/1.0' },
    cache: 'no-store',
  }).catch(() => null);

  if (!upstream) {
    return new NextResponse('Upstream fetch failed', { status: 502 });
  }
  if (!upstream.ok) {
    return new NextResponse(`Upstream error ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  const looksLikeManifest =
    contentType.includes('mpegurl') ||
    rawUrl.includes('.m3u8') ||
    rawUrl.includes('/manifest') ||
    contentType.includes('tidal.bts');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (looksLikeManifest) {
    const text = await upstream.text();
    const rewritten = rewriteManifestSegments(text, rawUrl);
    return new NextResponse(rewritten, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Audio segment – stream through.
  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      ...corsHeaders,
      'Content-Type': contentType || 'audio/aac',
      'Cache-Control': 'max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
