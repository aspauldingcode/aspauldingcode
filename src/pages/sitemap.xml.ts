import type { APIRoute } from 'astro';
import { getProjects } from '@/content/projects';
import {
  homeLastmod,
  resumePdfLastmod,
  whispererLegalLastmod,
  workLastmod,
} from '@/lib/contentMtime';
import resumePdf from '@/lib/resumePdf.json';
import { SITE_URL } from '@/lib/seo';

export const prerender = true;

export const GET: APIRoute = () => {
  const root = process.cwd();
  const urls = [
    { loc: SITE_URL, lastmod: homeLastmod(root), changefreq: 'weekly', priority: '1.0' },
    {
      loc: `${SITE_URL}${resumePdf.href}`,
      lastmod: resumePdfLastmod(root),
      changefreq: 'monthly',
      priority: '0.9',
    },
    ...getProjects().map((p) => ({
      loc: `${SITE_URL}/work/${p.slug}`,
      lastmod: workLastmod(root, p.slug),
      changefreq: 'monthly',
      priority: '0.85',
    })),
    {
      loc: `${SITE_URL}/whisperer/privacy`,
      lastmod: whispererLegalLastmod(root),
      changefreq: 'yearly',
      priority: '0.3',
    },
    {
      loc: `${SITE_URL}/whisperer/terms`,
      lastmod: whispererLegalLastmod(root),
      changefreq: 'yearly',
      priority: '0.3',
    },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
