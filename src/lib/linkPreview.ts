import { isPreviewOnlyUrl } from '@/lib/viewHref';
import {
  fetchProfileCard,
  type ProfileCard,
} from '@/lib/profileCard';

export type { ProfileCard };
export type LinkPreview = ProfileCard;

const CACHE_MS = 3600_000;
const cache = new Map<string, { expiresAt: number; value: LinkPreview | null }>();

/**
 * Uniform profile card for non-embeddable social links.
 * Uses platform JSON APIs when available (GitHub, Mastodon, YouTube),
 * otherwise OG / JSON-LD scrape. Always the same field shape.
 */
export async function fetchLinkPreview(href: string): Promise<LinkPreview | null> {
  if (!isPreviewOnlyUrl(href) && !href.startsWith('https://')) {
    return null;
  }

  const now = Date.now();
  const hit = cache.get(href);
  if (hit && now < hit.expiresAt) return hit.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const value = await fetchProfileCard(href, controller.signal);
    cache.set(href, { value, expiresAt: now + CACHE_MS });
    return value;
  } catch {
    cache.set(href, { value: null, expiresAt: now + 60_000 });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export {
  shouldProxyPreviewImage,
  proxiedPreviewImage,
} from '@/lib/linkPreviewImage';
