/** JSON Response helper for Astro API routes and tests. */
export function json(data: unknown, init: number | ResponseInit = 200): Response {
  const opts: ResponseInit = typeof init === 'number' ? { status: init } : init;
  const headers = new Headers(opts.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }
  return new Response(JSON.stringify(data), { ...opts, headers });
}
