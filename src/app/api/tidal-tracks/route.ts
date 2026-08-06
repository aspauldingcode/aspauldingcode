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
/** Dedupe concurrent identical catalog requests (React Strict Mode double-mount). */
const catalogInflight = new Map<string, Promise<TrackManifestResult[]>>();

let cachedToken: { value: string; expiresAt: number } | null = null;

type ReleaseType = TrackManifestResult['releaseType'];

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function classifyReleaseTypeFromAttributes(attrs: unknown): ReleaseType {
  const record = asRecord(attrs);
  const mediaMeta = asRecord(record?.mediaMetadata);
  const candidates = [
    record?.type,
    record?.releaseType,
    record?.albumType,
    mediaMeta?.releaseType,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toUpperCase());

  for (const value of candidates) {
    if (value.includes('EP')) return 'EP';
    if (value.includes('SINGLE')) return 'SINGLE';
    if (value.includes('ALBUM') || value.includes('LP')) return 'ALBUM';
  }

  const numberOfTracks = Number(record?.numberOfTracks ?? record?.trackCount ?? NaN);
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
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
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
  const token = typeof data.access_token === 'string' ? data.access_token : null;
  if (!token) return null;
  const expiresIn = Number(data.expires_in);
  const ttlMs = Number.isFinite(expiresIn)
    ? Math.max(30_000, (expiresIn - 60) * 1000)
    : 50 * 60 * 1000;
  cachedToken = { value: token, expiresAt: Date.now() + ttlMs };
  return token;
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

  let body: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.api+json',
      },
      cache: 'no-store',
    });

    if (res.status === 429 || res.status >= 500) {
      if (cached) return cached.payload;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      continue;
    }

    if (!res.ok) {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
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

  const root = asRecord(body);
  const data = asRecord(root?.data);
  const attrs = asRecord(data?.attributes) ?? {};

  const rawPresentation =
    typeof attrs.trackPresentation === 'string' ? attrs.trackPresentation : 'UNKNOWN';
  const previewReason =
    typeof attrs.previewReason === 'string' ? attrs.previewReason : undefined;
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

  const trackBody = asRecord(await trackRes.json());
  const included = Array.isArray(trackBody?.included) ? trackBody.included : [];
  const firstAlbum = included.find((item) => asRecord(item)?.type === 'albums');
  const firstAlbumRec = asRecord(firstAlbum);
  const albumAttrs = asRecord(firstAlbumRec?.attributes);
  const relationships = asRecord(asRecord(trackBody?.data)?.relationships);
  const albumsRel = asRecord(relationships?.albums);
  const albumsData = Array.isArray(albumsRel?.data) ? albumsRel.data : [];
  const firstAlbumRel = asRecord(albumsData[0]);
  const albumId =
    typeof firstAlbumRec?.id === 'string'
      ? firstAlbumRec.id
      : typeof firstAlbumRel?.id === 'string'
        ? firstAlbumRel.id
        : null;

  const releaseTitle =
    typeof albumAttrs?.title === 'string' ? albumAttrs.title : null;
  const releaseType = classifyReleaseTypeFromAttributes(albumAttrs);

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
  const coverRelBody = asRecord(await coverRelRes.json());
  const coverRelData = Array.isArray(coverRelBody?.data) ? coverRelBody.data : [];
  const firstCover = asRecord(coverRelData[0]);
  const artId = typeof firstCover?.id === 'string' ? firstCover.id : null;
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
  const artBody = asRecord(await artRes.json());
  const artAttrs = asRecord(asRecord(artBody?.data)?.attributes);
  const files = Array.isArray(artAttrs?.files) ? artAttrs.files : [];
  type ArtFile = { href?: unknown; meta?: { width?: unknown } };
  const sortedFiles = files
    .map((file) => asRecord(file) as ArtFile | null)
    .filter((file): file is ArtFile & { href: string } => typeof file?.href === 'string')
    .sort((a, b) => {
      const aw = asRecord(a.meta)?.width;
      const bw = asRecord(b.meta)?.width;
      return (typeof bw === 'number' ? bw : 0) - (typeof aw === 'number' ? aw : 0);
    });
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

  const flightKey = `${countryCode}:${ids.join(',')}`;
  let pending = catalogInflight.get(flightKey);
  if (!pending) {
    pending = (async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('token');

      const tracks: TrackManifestResult[] = [];
      for (const id of ids) {
        // Sequential on purpose to reduce burst rate limiting from TIDAL.
        tracks.push(await fetchTrackManifest(id, token, countryCode));
      }

      // One retry pass for any track that came back without a stream.
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i]!;
        if (t.uri || t.manifest) continue;
        await new Promise((r) => setTimeout(r, 400));
        tracks[i] = await fetchTrackManifest(t.id, token, countryCode);
      }

      return tracks;
    })().finally(() => {
      catalogInflight.delete(flightKey);
    });
    catalogInflight.set(flightKey, pending);
  }

  try {
    const tracks = await pending;
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ error: 'Failed to obtain TIDAL access token' }, { status: 500 });
  }
}
