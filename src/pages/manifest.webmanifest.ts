import type { APIRoute } from 'astro';
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, siteDescription } from '@/lib/seo';

export const prerender = true;

export const GET: APIRoute = () => {
  const body = {
    name: SITE_NAME,
    short_name: 'aspauldingcode',
    description: siteDescription(),
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f2ec',
    theme_color: '#121411',
    lang: 'en',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { src: DEFAULT_OG_IMAGE, sizes: '512x512', type: 'image/jpeg', purpose: 'any' },
    ],
    id: SITE_URL,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/manifest+json; charset=utf-8' },
  });
};
