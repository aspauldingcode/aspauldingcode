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
 * Known frame-blockers. Skip iframe attempts and go straight to OG preview
 * cards — no embed probe / timeout fallback.
 */
const PREVIEW_ONLY_HOSTS = new Set([
  'github.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'mobile.twitter.com',
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'mastodon.social',
]);

function hostKey(hostname: string): string {
  return hostname.replace(/^www\./, '').toLowerCase();
}

/** True when we never attempt an iframe for this URL. */
export function isPreviewOnlyUrl(href: string): boolean {
  try {
    const u = new URL(href);
    if (u.protocol !== 'https:') return false;
    return PREVIEW_ONLY_HOSTS.has(hostKey(u.hostname));
  } catch {
    return false;
  }
}

/**
 * Map public share URLs to vendor embed URLs (Spotify / Apple Music).
 * Social + YouTube stay preview-only — they block framing or we prefer cards.
 */
function toEmbedUrl(u: URL): string | null {
  const host = hostKey(u.hostname);

  if (PREVIEW_ONLY_HOSTS.has(host)) return null;

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

  return null;
}

function isEmbeddable(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    const u = new URL(href);
    if (u.protocol !== 'https:') return false;
    const host = hostKey(u.hostname);
    if (PREVIEW_ONLY_HOSTS.has(host)) return false;
    if (FRAME_HOSTS.has(u.hostname) || FRAME_HOSTS.has(host)) return true;
    if (host === 'open.spotify.com' && u.pathname.startsWith('/embed/')) return true;
    if (host === 'embed.music.apple.com') return true;
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

    if (PREVIEW_ONLY_HOSTS.has(hostKey(u.hostname))) {
      return {
        href: openHref,
        openHref,
        label,
        embeddable: false,
      };
    }

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
