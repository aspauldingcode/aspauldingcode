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
      { src: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/favicon.ico', sizes: '48x48 32x32 16x16', type: 'image/x-icon' },
      { src: DEFAULT_OG_IMAGE, sizes: '1200x1200', type: 'image/jpeg', purpose: 'any' },
    ],
    id: SITE_URL,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/manifest+json; charset=utf-8' },
  });
};
