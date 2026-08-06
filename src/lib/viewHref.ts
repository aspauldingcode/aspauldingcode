/** Build /view?u=… targets for in-portfolio embedding. */

export type ViewTarget = {
  /** URL loaded in the iframe (may be an official embed endpoint). */
  href: string;
  /** Canonical URL for “Open in new tab”. */
  openHref: string;
  /** Short label for chrome. */
  label: string;
  /** True when we should attempt an iframe. */
  embeddable: boolean;
};

/** Hosts that allow arbitrary page framing. */
const FRAME_HOSTS = new Set(['wawona.io', 'www.wawona.io']);

/**
 * Map public share URLs to vendor embed URLs.
 * Full pages (GitHub, Spotify web, etc.) send CSP frame-ancestors / XFO and
 * cannot be forced. Official embed endpoints are the supported 2026 path.
 */
function toEmbedUrl(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');

  // Spotify: /artist|album|track|playlist|episode|show/:id → /embed/...
  if (host === 'open.spotify.com') {
    if (u.pathname.startsWith('/embed/')) return u.toString();
    const m = u.pathname.match(
      /^\/(artist|album|track|playlist|episode|show)\/([A-Za-z0-9]+)/
    );
    if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
  }

  // Apple Music → embed.music.apple.com (same path)
  if (host === 'music.apple.com') {
    return `https://embed.music.apple.com${u.pathname}${u.search}`;
  }

  // YouTube watch / shorts / youtu.be → youtube-nocookie embed
  // Channels and @handles stay non-embeddable (preview card).
  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '').split('/')[0];
    if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const v = u.searchParams.get('v');
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    const shorts = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/);
    if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`;
    const embed = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/);
    if (embed) return `https://www.youtube-nocookie.com/embed/${embed[1]}`;
  }

  return null;
}

function isEmbeddable(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    const u = new URL(href);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.replace(/^www\./, '');
    if (FRAME_HOSTS.has(u.hostname) || FRAME_HOSTS.has(host)) return true;
    if (host === 'open.spotify.com' && u.pathname.startsWith('/embed/')) return true;
    if (host === 'embed.music.apple.com') return true;
    if (host === 'youtube-nocookie.com' && u.pathname.startsWith('/embed/'))
      return true;
    return false;
  } catch {
    return false;
  }
}

/** Parse and validate `u` query (https only, or same-origin absolute path). */
export function parseViewTarget(raw: string | undefined | null): ViewTarget | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (trimmed.includes('://') || trimmed.includes('\\')) return null;
    return {
      href: trimmed,
      openHref: trimmed,
      label: trimmed,
      embeddable: true,
    };
  }

  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:') return null;
    const openHref = u.toString();
    const label = `${u.host}${u.pathname === '/' ? '' : u.pathname}${u.search}`;
    const embed = toEmbedUrl(u);
    const href = embed ?? openHref;
    return {
      href,
      openHref,
      label,
      embeddable: Boolean(embed) || isEmbeddable(href),
    };
  } catch {
    return null;
  }
}

/** Map a link href to the in-pane viewer route when appropriate. */
export function viewHref(href: string): string {
  if (!href || href.startsWith('#') || href.startsWith('mailto:')) return href;

  if (href.startsWith('/') && !href.startsWith('//')) {
    if (href.includes('://') || href.includes('\\')) return href;
    return `/view?u=${encodeURIComponent(href)}`;
  }

  try {
    const u = new URL(href);
    if (u.protocol === 'https:') {
      return `/view?u=${encodeURIComponent(u.toString())}`;
    }
  } catch {
    /* leave alone */
  }

  return href;
}
