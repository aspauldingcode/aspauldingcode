import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_URL, siteDescription, DEFAULT_OG_IMAGE } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'aspauldingcode',
    description: siteDescription(),
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f2ec',
    theme_color: '#121411',
    lang: 'en',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: DEFAULT_OG_IMAGE,
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
    id: SITE_URL,
  };
}
