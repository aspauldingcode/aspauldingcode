#!/usr/bin/env node
/** Serve prerendered dist/client for benches. /view is a static shell.
 *  Live /api/preview and TIDAL need `astro dev` or Vercel. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const roots = [
  join(process.cwd(), '.vercel', 'output', 'static'),
  join(process.cwd(), 'dist', 'client'),
  join(process.cwd(), 'public'),
];
const port = Number(process.env.PORT || process.env.BENCH_PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

async function fileFor(urlPath) {
  const raw = decodeURIComponent(urlPath.split('?')[0] || '/');
  const safe = normalize(raw)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  const candidates = [];
  for (const root of roots) {
    candidates.push(join(root, safe), join(root, safe, 'index.html'), `${join(root, safe)}.html`);
  }
  if (safe === '/projects' || safe.startsWith('/projects/')) {
    candidates.unshift(join(roots[0], 'projects', 'index.html'));
  }
  for (const file of candidates) {
    try {
      const st = await stat(file);
      if (st.isFile()) return file;
    } catch {
      /* next */
    }
  }
  return null;
}

const redirects = new Map([
  ['/projects', '/'],
  ['/resume', '/resume.pdf'],
]);

const server = createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const dest = redirects.get(urlPath);
  if (dest) {
    res.writeHead(301, { Location: dest });
    res.end();
    return;
  }
  const file = await fileFor(req.url || '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(body);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`static preview http://127.0.0.1:${port}`);
});
