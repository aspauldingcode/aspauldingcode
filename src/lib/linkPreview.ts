import { preview } from 'linkpeek';
import { cache } from 'react';

export type LinkPreview = {
  title: string | null;
  description: string | null;
  image: string | null;
  imageAlt: string | null;
  siteName: string;
  favicon: string | null;
  canonicalUrl: string;
};

/** Fetch OG / Twitter Card metadata. SSRF-safe (linkpeek blocks private IPs). */
export const fetchLinkPreview = cache(
  async (href: string): Promise<LinkPreview | null> => {
    try {
      const u = new URL(href);
      if (u.protocol !== 'https:') return null;

      const result = await preview(href, {
        timeout: 8000,
        maxBytes: 80_000,
        includeBodyContent: true,
        allowPrivateIPs: false,
      });

      return {
        title: result.title,
        description: result.description,
        image: result.image,
        imageAlt: result.imageAlt,
        siteName: result.siteName,
        favicon: result.favicon,
        canonicalUrl: result.canonicalUrl || href,
      };
    } catch {
      return null;
    }
  }
);
