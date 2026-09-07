/** Build /view?u=… targets for external cards and vendor embeds. */

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

/** This portfolio, including www and local preview hosts. */
const SITE_HOSTS = new Set(['aspauldingcode.com', 'www.aspauldingcode.com']);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

/** Live project hosts that have a same-origin /work/* page in this repo. */
const PROJECT_PATHS: Record<string, string> = {
  'wawona.io': '/work/wawona',
  'www.wawona.io': '/work/wawona',
};

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
  'ewu.edu',
]);

function hostKey(hostname: string): string {
  return hostname.replace(/^www\./, '').toLowerCase();
}

function isOwnHost(hostname: string, pageOrigin?: string): boolean {
  const host = hostname.replace(/^\[(.*)\]$/, '$1').toLowerCase();
  const key = hostKey(host);
  if (SITE_HOSTS.has(host) || SITE_HOSTS.has(key)) return true;
  if (LOCAL_HOSTS.has(host) || LOCAL_HOSTS.has(key)) return true;
  if (!pageOrigin) return false;
  try {
    const page = new URL(pageOrigin);
    return hostKey(page.hostname) === key || page.hostname.toLowerCase() === host;
  } catch {
    return false;
  }
}

/**
 * Same-origin path for this site, localhost, or a mapped project host.
 * Returns null for third-party URLs (GitHub, Spotify, EWU, …).
 */
export function localPathForHref(href: string, pageOrigin?: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('mailto:')) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (trimmed.includes('://') || trimmed.includes('\\')) return null;
    return trimmed;
  }

  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = hostKey(u.hostname);
    const project = PROJECT_PATHS[u.hostname.toLowerCase()] || PROJECT_PATHS[host];
    if (project) return project;
    if (!isOwnHost(u.hostname, pageOrigin)) return null;
    const path = `${u.pathname}${u.search}${u.hash}`;
    return path || '/';
  } catch {
    return null;
  }
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
  try {
    const u = new URL(href);
    if (u.protocol !== 'https:') return false;
    const host = hostKey(u.hostname);
    if (PREVIEW_ONLY_HOSTS.has(host)) return false;
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

  if (localPathForHref(trimmed)) return null;

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

/** Map a link href to a same-origin path, or the in-pane viewer for third parties. */
export function viewHref(href: string): string {
  if (!href || href.startsWith('#') || href.startsWith('mailto:')) return href;

  const local = localPathForHref(href);
  if (local) return local;

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
