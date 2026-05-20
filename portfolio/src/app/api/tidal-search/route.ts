import { NextRequest, NextResponse } from 'next/server';

type TidalSearchPayload = {
  data?: unknown;
  included: unknown[];
};

type CacheEntry = {
  expiresAt: number;
  payload: TidalSearchPayload;
};

const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const searchCache = new Map<string, CacheEntry>();

// GET /api/tidal-search?q=BladeWalker+ModernOrange&countryCode=US
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q           = searchParams.get('q') ?? '';
  const countryCode = searchParams.get('countryCode') ?? 'US';
  const query = q.trim();
  const cacheKey = `${countryCode}::${query.toLowerCase()}`;

  if (!query) {
    return NextResponse.json({ included: [] }, { status: 200 });
  }

  const now = Date.now();
  const cached = searchCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return NextResponse.json(cached.payload, { status: 200 });
  }

  // Get a fresh access token from our own secure endpoint
  const tokenRes = await fetch(`${req.nextUrl.origin}/api/tidal-token`);
  if (!tokenRes.ok) return NextResponse.json({ error: 'token fetch failed' }, { status: 500 });
  const { token } = await tokenRes.json();

  // TIDAL path is case-sensitive: /searchResults/{id}
  const url = `https://openapi.tidal.com/v2/searchResults/${encodeURIComponent(query)}?countryCode=${countryCode}&include=tracks`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.api+json',
    },
  });

  if (res.status === 429) {
    // In dev React strict mode, repeated mounts can trigger bursts.
    // Serve stale cache if available; otherwise provide a soft-empty payload.
    if (cached) {
      return NextResponse.json(cached.payload, { status: 200 });
    }
    return NextResponse.json({ included: [] }, { status: 200 });
  }

  if (res.status === 404) {
    // No search result id for this query; return empty tracks payload for client fallback.
    const payload: TidalSearchPayload = { included: [] };
    searchCache.set(cacheKey, {
      payload,
      expiresAt: now + SEARCH_CACHE_TTL_MS,
    });
    return NextResponse.json(payload, { status: 200 });
  }

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  const payload: TidalSearchPayload = {
    data: data.data,
    included: Array.isArray(data.included) ? data.included : [],
  };
  searchCache.set(cacheKey, {
    payload,
    expiresAt: now + SEARCH_CACHE_TTL_MS,
  });
  return NextResponse.json(payload);
}
