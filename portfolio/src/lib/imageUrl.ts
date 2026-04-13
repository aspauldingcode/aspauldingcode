const CDN_BASE = process.env.NEXT_PUBLIC_IMAGE_CDN_BASE?.replace(/\/$/, '');

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function resolveImageUrl(path: string): string {
  if (!path) return path;
  if (isAbsoluteUrl(path)) return path;
  if (!CDN_BASE) return path;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${CDN_BASE}${normalized}`;
}
