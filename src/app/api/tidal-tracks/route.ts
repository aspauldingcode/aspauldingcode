import { NextRequest, NextResponse } from 'next/server';

type TrackManifestResult = {
  id: string;
  /** Proxied HLS manifest URL (already routed through /api/tidal-hls-proxy). */
  uri: string | null;
  /**
   * Decoded + segment-URL-rewritten HLS manifest text.
   * Present when TIDAL returns a base64 `manifest` field instead of a `uri`.
   * The client should create a Blob URL from this and pass it to HLS.js.
   */
  manifest?: string;
  trackPresentation: 'FULL' | 'PREVIEW' | 'UNKNOWN';
  previewReason?: string;
  coverUrl: string | null;
  releaseTitle: string | null;
  releaseType: 'ALBUM' | 'EP' | 'SINGLE' | 'UNKNOWN';
};

type ManifestCacheEntry = {
  expiresAt: number;
  payload: TrackManifestResult;
};

const MANIFEST_CACHE_FALLBACK_MS = 10 * 60 * 1000;
const manifestCache = new Map<string, ManifestCacheEntry>();
const albumCoverCache = new Map<string, { coverUrl: string | null }>();
type ReleaseType = TrackManifestResult['releaseType'];

function classifyReleaseTypeFromAttributes(attrs: any): ReleaseType {
  const candidates = [
    attrs?.type,
    attrs?.releaseType,
    attrs?.albumType,
    attrs?.mediaMetadata?.releaseType,
  ]
    .filter((value) => typeof value === 'string')
    .map((value: string) => value.toUpperCase());

  for (const value of candidates) {
    if (value.includes('EP')) return 'EP';
    if (value.includes('SINGLE')) return 'SINGLE';
    if (value.includes('ALBUM') || value.includes('LP')) return 'ALBUM';
  }

  const numberOfTracks = Number(attrs?.numberOfTracks ?? attrs?.trackCount ?? NaN);
  if (Number.isFinite(numberOfTracks) && numberOfTracks > 0) {
    if (numberOfTracks <= 3) return 'SINGLE';
    if (numberOfTracks <= 7) return 'EP';
    return 'ALBUM';
  }

  return 'UNKNOWN';
}

function getCredentials() {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function getAccessToken() {
  const creds = getCredentials();
  if (!creds) return null;
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const res = await fetch('https://auth.tidal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.access_token === 'string' ? data.access_token : null;
}

function cacheExpiryFromManifestUri(uri: string) {
  try {
    const parsed = new URL(uri);
    const raw = parsed.searchParams.get('Expires');
    if (!raw) return Date.now() + MANIFEST_CACHE_FALLBACK_MS;
    const secs = Number(raw);
    if (!Number.isFinite(secs) || secs <= 0) return Date.now() + MANIFEST_CACHE_FALLBACK_MS;
    return Math.max(Date.now() + 30_000, secs * 1000 - 60_000);
  } catch {
    return Date.now() + MANIFEST_CACHE_FALLBACK_MS;
  }
}

/**
 * Rewrites absolute segment/playlist URLs inside a decoded HLS manifest so
 * they are fetched through our server-side proxy instead of directly from
 * TIDAL's CDN (which would be blocked by CORS in the browser).
 */
function rewriteInlineManifestSegments(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (!trimmed.startsWith('#')) {
        // Plain segment / sub-playlist URL line.
        if (trimmed.startsWith('http')) {
          return `/api/tidal-hls-proxy?url=${encodeURIComponent(trimmed)}`;
        }
        return line;
      }

      // Rewrite URI="..." attributes inside HLS tags (e.g. #EXT-X-MAP, #EXT-X-KEY).
      return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
        if (uri.startsWith('http')) {
          return `URI="/api/tidal-hls-proxy?url=${encodeURIComponent(uri)}"`;
        }
        return `URI="${uri}"`;
      });
    })
    .join('\n');
}

async function fetchTrackManifest(id: string, token: string, countryCode: string): Promise<TrackManifestResult> {
  const cacheKey = `${countryCode}:${id}`;
  const now = Date.now();
  const cached = manifestCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.payload;
  }

  const url = new URL(`https://openapi.tidal.com/v2/trackManifests/${id}`);
  url.searchParams.set('countryCode', countryCode);
  url.searchParams.set('manifestType', 'HLS');
  url.searchParams.set('uriScheme', 'HTTPS');
  url.searchParams.set('usage', 'PLAYBACK');
  url.searchParams.set('adaptive', 'true');
  url.searchParams.set('formats', 'AACLC,HEAACV1');

  let body: any = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.api+json',
      },
      cache: 'no-store',
    });

    if (res.status === 429) {
      if (cached) return cached.payload;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
    }

    if (!res.ok) {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }
      return {
        id,
        uri: null,
        trackPresentation: 'UNKNOWN',
        coverUrl: null,
        releaseTitle: null,
        releaseType: 'UNKNOWN',
      };
    }

    body = await res.json();
    break;
  }

  if (!body) {
    return {
      id,
      uri: null,
      trackPresentation: 'UNKNOWN',
      coverUrl: null,
      releaseTitle: null,
      releaseType: 'UNKNOWN',
    };
  }

  const attrs = body?.data?.attributes ?? {};

  // Log what TIDAL actually returns so we can validate the field names.
  const attrKeys = Object.keys(attrs);
  console.log(`[tidal-tracks] track ${id} attr keys:`, attrKeys, '| uri:', attrs.uri, '| manifest length:', typeof attrs.manifest === 'string' ? attrs.manifest.length : 'none');

  const rawPresentation = typeof attrs.trackPresentation === 'string' ? attrs.trackPresentation : 'UNKNOWN';
  const previewReason = typeof attrs.previewReason === 'string' ? attrs.previewReason : undefined;
  const presentation: TrackManifestResult['trackPresentation'] =
    rawPresentation === 'FULL' || rawPresentation === 'PREVIEW' ? rawPresentation : 'UNKNOWN';

  // TIDAL can return either:
  //   attrs.uri  – a signed CDN URL to the HLS manifest (when uriScheme=HTTPS is set)
  //   attrs.manifest – base64-encoded HLS manifest content (older / non-URI scheme)
  let uri: string | null = null;
  let manifest: string | undefined;

  const rawTidalUri = typeof attrs.uri === 'string' && attrs.uri.startsWith('http') ? attrs.uri : null;

  if (rawTidalUri) {
    // Wrap the CDN URI through our server-side proxy to avoid CORS errors in the browser.
    uri = `/api/tidal-hls-proxy?url=${encodeURIComponent(rawTidalUri)}`;
  } else if (typeof attrs.manifest === 'string' && attrs.manifest.length > 0) {
    // Decode the base64 HLS manifest and rewrite segment URLs through our proxy.
    try {
      const decoded = Buffer.from(attrs.manifest, 'base64').toString('utf-8');
      manifest = rewriteInlineManifestSegments(decoded);
      // uri remains null; the client will build a Blob URL from manifest.
    } catch {
      console.warn(`[tidal-tracks] failed to decode manifest for track ${id}`);
    }
  }

  const payload: TrackManifestResult = {
    id,
    uri,
    manifest,
    trackPresentation: presentation,
    previewReason: previewReason,
    coverUrl: null,
    releaseTitle: null,
    releaseType: 'UNKNOWN',
  };

  const cover = await fetchTrackCoverArt(id, token, countryCode);
  payload.coverUrl = cover.coverUrl;
  payload.releaseTitle = cover.releaseTitle;
  payload.releaseType = cover.releaseType;

  manifestCache.set(cacheKey, {
    payload,
    // Use the original TIDAL CDN URL (with its Expires param) for expiry;
    // our proxy URL doesn't carry that param.
    expiresAt: rawTidalUri ? cacheExpiryFromManifestUri(rawTidalUri) : now + 60_000,
  });

  return payload;
}

async function fetchTrackCoverArt(id: string, token: string, countryCode: string) {
  const trackUrl = new URL(`https://openapi.tidal.com/v2/tracks/${id}`);
  trackUrl.searchParams.set('countryCode', countryCode);
  trackUrl.searchParams.set('include', 'albums');

  const trackRes = await fetch(trackUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
    },
    cache: 'no-store',
  });

  if (!trackRes.ok) {
    return { coverUrl: null as string | null, releaseTitle: null as string | null, releaseType: 'UNKNOWN' as const };
  }

  const trackBody = await trackRes.json();
  const included = Array.isArray(trackBody?.included) ? trackBody.included : [];
  const firstAlbum = included.find((item: any) => item?.type === 'albums');
  const albumId =
    typeof firstAlbum?.id === 'string'
      ? firstAlbum.id
      : typeof trackBody?.data?.relationships?.albums?.data?.[0]?.id === 'string'
        ? trackBody.data.relationships.albums.data[0].id
        : null;

  const releaseTitle =
    typeof firstAlbum?.attributes?.title === 'string'
      ? firstAlbum.attributes.title
      : null;
  const releaseType = classifyReleaseTypeFromAttributes(firstAlbum?.attributes);

  if (!albumId) {
    return { coverUrl: null as string | null, releaseTitle, releaseType };
  }
  const cached = albumCoverCache.get(albumId);
  if (cached) {
    return { ...cached, releaseTitle, releaseType };
  }

  const coverRelUrl = new URL(`https://openapi.tidal.com/v2/albums/${albumId}/relationships/coverArt`);
  coverRelUrl.searchParams.set('countryCode', countryCode);
  const coverRelRes = await fetch(coverRelUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
    },
    cache: 'no-store',
  });
  if (!coverRelRes.ok) return { coverUrl: null as string | null, releaseTitle, releaseType };
  const coverRelBody = await coverRelRes.json();
  const artId = typeof coverRelBody?.data?.[0]?.id === 'string' ? coverRelBody.data[0].id : null;
  if (!artId) return { coverUrl: null as string | null, releaseTitle, releaseType };

  const artUrl = new URL(`https://openapi.tidal.com/v2/artworks/${artId}`);
  artUrl.searchParams.set('countryCode', countryCode);
  const artRes = await fetch(artUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
    },
    cache: 'no-store',
  });
  if (!artRes.ok) return { coverUrl: null as string | null, releaseTitle, releaseType };
  const artBody = await artRes.json();
  const files = Array.isArray(artBody?.data?.attributes?.files) ? artBody.data.attributes.files : [];
  const sortedFiles = files
    .filter((file: any) => typeof file?.href === 'string')
    .sort((a: any, b: any) => (b?.meta?.width ?? 0) - (a?.meta?.width ?? 0));
  const coverUrl = sortedFiles[0]?.href ?? null;
  const payload = { coverUrl };
  albumCoverCache.set(albumId, payload);
  return { ...payload, releaseTitle, releaseType };
}

export async function GET(req: NextRequest) {
  const idsRaw = req.nextUrl.searchParams.get('ids') ?? '';
  const countryCode = 'US';
  const ids = idsRaw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^[0-9]+$/.test(id));

  if (!ids.length) {
    return NextResponse.json({ error: 'No valid track ids provided' }, { status: 400 });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: 'Failed to obtain TIDAL access token' }, { status: 500 });
  }

  const tracks: TrackManifestResult[] = [];
  for (const id of ids) {
    // Sequential on purpose to reduce burst rate limiting from TIDAL.
    tracks.push(await fetchTrackManifest(id, token, countryCode));
  }

  return NextResponse.json({ tracks });
}
