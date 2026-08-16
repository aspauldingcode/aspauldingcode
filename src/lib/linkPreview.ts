import { unstable_cache } from 'next/cache';
import { isPreviewOnlyUrl } from '@/lib/viewHref';
import {
  fetchProfileCard,
  type ProfileCard,
} from '@/lib/profileCard';

export type { ProfileCard };
export type LinkPreview = ProfileCard;

/**
 * Uniform profile card for non-embeddable social links.
 * Uses platform JSON APIs when available (GitHub, Mastodon, YouTube),
 * otherwise OG / JSON-LD scrape — always the same field shape.
 */
export function fetchLinkPreview(href: string): Promise<LinkPreview | null> {
  if (!isPreviewOnlyUrl(href) && !href.startsWith('https://')) {
    return Promise.resolve(null);
  }

  return unstable_cache(
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        return await fetchProfileCard(href, controller.signal);
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
    ['profile-card-v9', href],
    { revalidate: 3600 }
  )();
}

export {
  shouldProxyPreviewImage,
  proxiedPreviewImage,
} from '@/lib/linkPreviewImage';
