import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

const resumePdf = JSON.parse(
  readFileSync(new URL('./src/lib/resumePdf.json', import.meta.url), 'utf8')
);

const site = (process.env.PUBLIC_SITE_URL || 'https://www.aspauldingcode.com').replace(
  /\/$/,
  ''
);

export default defineConfig({
  site,
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  trailingSlash: 'never',
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  redirects: {
    '/resume': {
      status: 301,
      destination: resumePdf.href,
    },
    '/resume.pdf': {
      status: 301,
      destination: resumePdf.href,
    },
    '/projects': {
      status: 301,
      destination: '/',
    },
  },
});
