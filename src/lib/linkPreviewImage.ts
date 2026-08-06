/** LinkedIn CDN blocks hotlinks — serve via same-origin proxy. */

export function shouldProxyPreviewImage(imageUrl: string): boolean {
  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    return host === 'licdn.com' || host.endsWith('.licdn.com');
  } catch {
    return false;
  }
}

export function proxiedPreviewImage(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (!shouldProxyPreviewImage(imageUrl)) return imageUrl;
  return `/api/preview-image?u=${encodeURIComponent(imageUrl)}`;
}
