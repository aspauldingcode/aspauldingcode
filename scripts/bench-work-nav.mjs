#!/usr/bin/env node
/** Time /work/* document fetch. Client-route paint is measured in the browser. */
const origin = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3000';
const slugs = [
  'wawona',
  'apple-sharpener',
  'whisperer',
  'modernorange-band',
  'sentinel-pc-building-club',
];

async function timePath(path) {
  const url = new URL(path, origin);
  const t0 = performance.now();
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const ms = performance.now() - t0;
  const detail = buf.toString('utf8');
  const extracted = /class="wrap detail-pane"/.test(detail);
  return {
    path,
    status: res.status,
    ms: Math.round(ms),
    bytes: buf.byteLength,
    extracted,
  };
}

const home = await timePath('/');
const rows = [];
for (const slug of slugs) {
  rows.push(await timePath(`/work/${slug}`));
}

console.log(
  JSON.stringify(
    {
      origin,
      home,
      work: rows,
      note: 'These are cold document fetches (MPA). Same-document routing should paint from cache in a few milliseconds after idle prefetch.',
    },
    null,
    2
  )
);

if (rows.some((r) => r.status !== 200 || !r.extracted)) {
  process.exitCode = 1;
}
