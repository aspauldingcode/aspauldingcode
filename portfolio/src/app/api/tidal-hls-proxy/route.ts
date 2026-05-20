import { NextRequest, NextResponse } from 'next/server';

// Allow any subdomain of tidal.com — all URLs are signed with Expires+Signature
// so there is no risk in being permissive at the domain level.
function isAllowedTidalUrl(url: URL): boolean {
  return url.hostname === 'tidal.com' || url.hostname.endsWith('.tidal.com');
}

function proxyIfTidal(rawUrl: string, baseUrl: URL | null): string {
  let segUrl = rawUrl;
  if (baseUrl && !rawUrl.startsWith('http')) {
    try {
      segUrl = new URL(rawUrl, baseUrl).toString();
    } catch {
      return rawUrl;
    }
  }
  try {
    if (isAllowedTidalUrl(new URL(segUrl))) {
      return `/api/tidal-hls-proxy?url=${encodeURIComponent(segUrl)}`;
    }
  } catch { /* ignore */ }
  return rawUrl;
}

function rewriteManifestSegments(content: string, manifestUrl: string): string {
  let baseUrl: URL | null = null;
  try {
    baseUrl = new URL(manifestUrl);
  } catch { /* only absolute URLs can be rewritten */ }

  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (!trimmed.startsWith('#')) {
        // Plain segment / sub-playlist URL line.
        return proxyIfTidal(trimmed, baseUrl);
      }

      // Rewrite URI="..." attributes inside HLS tags
      // e.g. #EXT-X-MAP:URI="...", #EXT-X-KEY:URI="..."
      return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
        return `URI="${proxyIfTidal(uri, baseUrl)}"`;
      });
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
    contentType.includes('tidal.bts') ||
    (rawUrl.includes('.m3u8') && !rawUrl.includes('.mp4')) ||
    (rawUrl.includes('/manifests/') && !rawUrl.endsWith('.mp4'));

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
