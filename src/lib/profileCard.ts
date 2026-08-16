/**
 * Uniform profile card for hosts that block iframe embeds.
 * Social networks fill follower counts; school pages can attach papers.
 */

import { preview } from 'linkpeek';
import { resume } from '@/content/resume';
import { proxiedPreviewImage } from '@/lib/linkPreviewImage';

export type ProfilePaper = {
  title: string;
  author: string;
  venue: string;
  date: string;
  year: string;
  href: string;
  summary: string | null;
  type: string | null;
  location: string | null;
  mentor: string | null;
  image: string | null;
  imageAlt: string | null;
};

export type ProfileCard = {
  network: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  status: string | null;
  bio: string | null;
  url: string;
  favicon: string | null;
  /** Always three slots for a uniform grid. */
  stats: {
    followers: number | null;
    following: number | null;
    posts: number | null;
  };
  /** Labels for the three slots (network-specific wording). */
  labels: {
    followers: string;
    following: string;
    posts: string;
  };
  extras: { label: string; value: string }[];
  /** Full paper list for school cards. Always shown on the card. */
  papers: ProfilePaper[];
  /** Pinned repositories (GitHub profile cards). */
  pins: ProfilePin[];
};

export type ProfilePin = {
  name: string;
  href: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number | null;
};

export const EWU_SYMPOSIUM_HREF = 'https://dc.ewu.edu/srcw_2026/';

function formatPaperDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return String(iso).slice(0, 4);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function papersFromResume(): ProfilePaper[] {
  const author = resume.basics.name;
  return [...(resume.publications ?? [])]
    .filter((pub) => pub.name && pub.url)
    .sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')))
    .map((pub) => ({
      title: pub.name,
      author: pub.author || author,
      venue: pub.publisher || 'Eastern Washington University',
      date: formatPaperDate(pub.releaseDate),
      year: String(pub.releaseDate || '').slice(0, 4),
      href: pub.url as string,
      summary: pub.summary?.trim() || null,
      type: pub.type?.trim() || null,
      location: pub.location?.trim() || null,
      mentor: pub.mentor?.trim() || null,
      image: pub.image || null,
      imageAlt: pub.imageAlt || null,
    }));
}

export const EWU_PUBLISHED_PAPERS: ProfilePaper[] = papersFromResume();

export function isEwuPreviewHost(href: string): boolean {
  return hostOf(href) === 'ewu.edu';
}

export function papersForUrl(href: string): ProfilePaper[] {
  return isEwuPreviewHost(href) ? papersFromResume() : [];
}

const UA = 'aspauldingcode-preview/1.0 (+https://aspauldingcode.com)';

function hostOf(href: string): string | null {
  try {
    return new URL(href).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function emptyCard(network: string, url: string): ProfileCard {
  return {
    network,
    username: null,
    displayName: null,
    avatar: null,
    status: null,
    bio: null,
    url,
    favicon: null,
    stats: { followers: null, following: null, posts: null },
    labels: {
      followers: 'Followers',
      following: 'Following',
      posts: 'Posts',
    },
    extras: [],
    papers: [],
    pins: [],
  };
}

async function fetchJson<T>(
  url: string,
  signal: AbortSignal,
  headers: Record<string, string> = {}
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json', 'User-Agent': UA, ...headers },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Best-effort OG/JSON-LD fill when a platform API is missing fields. */
async function scrapeBasics(
  href: string,
  signal: AbortSignal
): Promise<Partial<ProfileCard>> {
  try {
    const result = await preview(href, {
      signal,
      timeout: 4500,
      maxBytes: 160_000,
      includeBodyContent: true,
      followMetaRefresh: true,
      allowPrivateIPs: false,
      userAgent:
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    });
    return {
      displayName: result.title,
      bio: result.description,
      avatar: proxiedPreviewImage(result.image),
      favicon: result.favicon,
    };
  } catch {
    return {};
  }
}

function merge(base: ProfileCard, patch: Partial<ProfileCard>): ProfileCard {
  return {
    ...base,
    ...patch,
    stats: { ...base.stats, ...patch.stats },
    labels: { ...base.labels, ...patch.labels },
    extras: patch.extras ?? base.extras,
    papers: patch.papers ?? base.papers,
    pins: patch.pins ?? base.pins,
    avatar: proxiedPreviewImage(patch.avatar ?? base.avatar),
  };
}

/* ─── GitHub ─────────────────────────────────────────────────────────── */

type GhUser = {
  login?: string;
  name?: string | null;
  avatar_url?: string;
  bio?: string | null;
  followers?: number;
  following?: number;
  public_repos?: number;
  company?: string | null;
  location?: string | null;
  blog?: string | null;
  twitter_username?: string | null;
  created_at?: string;
  hireable?: boolean | null;
};

export function parseGitHubLogin(href: string): string | null {
  try {
    const path = new URL(href).pathname.replace(/\/$/, '');
    const parts = path.split('/').filter(Boolean);
    if (!parts.length) return null;
    const skip = new Set([
      'features',
      'topics',
      'collections',
      'trending',
      'events',
      'sponsors',
      'settings',
      'marketplace',
      'pulls',
      'issues',
      'explore',
      'notifications',
      'login',
      'join',
    ]);
    if (skip.has(parts[0].toLowerCase())) return null;
    return parts[0];
  } catch {
    return null;
  }
}

export function ownGitHubLogin(): string {
  const profile = (resume.basics.profiles ?? []).find(
    (row) => row.network?.toLowerCase() === 'github'
  );
  const fromUrl = profile?.url ? parseGitHubLogin(profile.url) : null;
  return (profile?.username || fromUrl || 'aspauldingcode').toLowerCase();
}

export function isOwnGitHubProfile(href: string): boolean {
  const login = parseGitHubLogin(href);
  return !!login && login.toLowerCase() === ownGitHubLogin();
}

export function pinsFromResume(): ProfilePin[] {
  return (resume.projects ?? [])
    .filter((project) => project.name && project.url)
    .map((project) => ({
      name: project.name,
      href: project.url as string,
      description: project.description?.trim() || null,
      language: null,
      languageColor: null,
      stars: null,
    }));
}

export function parseGitHubStatusFromHtml(html: string): string | null {
  const match = html.match(
    /user-status-emoji-container[\s\S]*?<div>([^<]*)<\/div>[\s\S]*?user-status-message-wrapper[\s\S]*?<div>([\s\S]*?)<\/div>/i
  );
  if (!match) return null;
  const emoji = match[1].trim();
  const message = stripHtml(match[2]).replace(/\s+/g, ' ').trim();
  if (!message) return null;
  return emoji ? `${emoji} ${message}` : message;
}

export function parseGitHubPinsFromHtml(html: string): ProfilePin[] {
  const chunks = html.split('pinned-item-list-item-content').slice(1);
  const pins: ProfilePin[] = [];

  for (const chunk of chunks) {
    const link = chunk.match(
      /href="(\/[^"]+)"[^>]*class="[^"]*wb-break-word[^"]*"/i
    );
    const repo = chunk.match(/<span class="repo">([^<]+)<\/span>/i);
    if (!link || !repo) continue;

    const path = link[1].split('?')[0];
    if (path.includes('/stargazers') || path.includes('/forks')) continue;

    const owner = chunk.match(/<span class="owner[^"]*">([^<]+)<\/span>/i);
    const ownerName = owner?.[1].replace(/\/$/, '').trim();
    const repoName = repo[1].trim();
    const name = ownerName ? `${ownerName}/${repoName}` : repoName;

    const descMatch = chunk.match(/pinned-item-desc[^>]*>([\s\S]*?)<\/p>/i);
    const langMatch = chunk.match(/itemprop="programmingLanguage">([^<]+)</i);
    const colorMatch = chunk.match(
      /repo-language-color"[^>]*style="background-color:\s*([^";]+)/i
    );
    const starsMatch = chunk.match(/aria-label="stars"[\s\S]*?<\/svg>\s*([\d,]+)/i);

    pins.push({
      name,
      href: `https://github.com${path}`,
      description: descMatch
        ? stripHtml(descMatch[1]).replace(/\s+/g, ' ').trim() || null
        : null,
      language: langMatch?.[1].trim() || null,
      languageColor: colorMatch?.[1].trim() || null,
      stars: starsMatch ? Number(starsMatch[1].replace(/,/g, '')) : null,
    });
  }

  return pins;
}

type GhGraphqlUser = {
  status?: { message?: string | null; emoji?: string | null } | null;
  pinnedItems?: {
    nodes?: Array<{
      name?: string;
      nameWithOwner?: string;
      description?: string | null;
      url?: string;
      stargazerCount?: number;
      primaryLanguage?: { name?: string; color?: string | null } | null;
    } | null>;
  };
};

async function fetchGitHubPinsAndStatus(
  login: string,
  signal: AbortSignal,
  headers: Record<string, string>
): Promise<{ pins: ProfilePin[]; status: string | null }> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        signal,
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `query($login: String!) {
            user(login: $login) {
              status { message emoji }
              pinnedItems(first: 6, types: REPOSITORY) {
                nodes {
                  ... on Repository {
                    name
                    nameWithOwner
                    description
                    url
                    stargazerCount
                    primaryLanguage { name color }
                  }
                }
              }
            }
          }`,
          variables: { login },
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: { user?: GhGraphqlUser | null } };
        const user = body.data?.user;
        if (user) {
          const pins = (user.pinnedItems?.nodes ?? [])
            .filter((node): node is NonNullable<typeof node> => !!node?.url && !!node.name)
            .map((node) => ({
              name:
                node.nameWithOwner &&
                node.nameWithOwner.split('/')[0].toLowerCase() !== login.toLowerCase()
                  ? node.nameWithOwner
                  : node.name || node.nameWithOwner || '',
              href: node.url as string,
              description: node.description?.trim() || null,
              language: node.primaryLanguage?.name || null,
              languageColor: node.primaryLanguage?.color || null,
              stars: node.stargazerCount ?? null,
            }));
          const message = user.status?.message?.trim() || '';
          return {
            pins,
            status: message || null,
          };
        }
      }
    } catch {
      /* scrape the public profile instead */
    }
  }

  try {
    const res = await fetch(`https://github.com/${encodeURIComponent(login)}`, {
      signal,
      headers: { Accept: 'text/html', 'User-Agent': UA },
      redirect: 'follow',
    });
    if (!res.ok) return { pins: [], status: null };
    const html = await res.text();
    return {
      pins: parseGitHubPinsFromHtml(html),
      status: parseGitHubStatusFromHtml(html),
    };
  } catch {
    return { pins: [], status: null };
  }
}

async function fromGitHub(href: string, signal: AbortSignal): Promise<ProfileCard> {
  const card = emptyCard('GitHub', href);
  card.labels = {
    followers: 'Followers',
    following: 'Following',
    posts: 'Repositories',
  };
  card.favicon = 'https://github.com/favicon.ico';

  const login = parseGitHubLogin(href);
  if (!login) return merge(card, await scrapeBasics(href, signal));

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const user = await fetchJson<GhUser>(
    `https://api.github.com/users/${encodeURIComponent(login)}`,
    signal,
    headers
  );
  if (!user?.login) return merge(card, await scrapeBasics(href, signal));

  const extras: ProfileCard['extras'] = [];
  if (user.company) extras.push({ label: 'Company', value: user.company.replace(/^@/, '') });
  if (user.location) extras.push({ label: 'Location', value: user.location });
  if (user.blog) extras.push({ label: 'Website', value: user.blog.replace(/^https?:\/\//, '') });
  if (user.twitter_username)
    extras.push({ label: 'X', value: `@${user.twitter_username}` });
  if (user.created_at) {
    const y = new Date(user.created_at).getFullYear();
    if (!Number.isNaN(y)) extras.push({ label: 'Joined', value: String(y) });
  }

  const extra = await fetchGitHubPinsAndStatus(user.login, signal, headers);
  const pins =
    extra.pins.length > 0
      ? extra.pins
      : isOwnGitHubProfile(href)
        ? pinsFromResume()
        : [];

  return {
    ...card,
    username: user.login,
    displayName: user.name || user.login,
    avatar: user.avatar_url || null,
    status: extra.status || (user.hireable ? 'Open to work' : null),
    bio: user.bio || null,
    stats: {
      followers: user.followers ?? null,
      following: user.following ?? null,
      posts: user.public_repos ?? null,
    },
    extras,
    pins,
  };
}

/* ─── Mastodon ───────────────────────────────────────────────────────── */

type MastoAccount = {
  username?: string;
  acct?: string;
  display_name?: string;
  avatar?: string;
  avatar_static?: string;
  note?: string;
  followers_count?: number;
  following_count?: number;
  statuses_count?: number;
  locked?: boolean;
  bot?: boolean;
  created_at?: string;
  fields?: { name?: string; value?: string }[];
};

function parseMastodonAcct(href: string): string | null {
  try {
    const path = new URL(href).pathname;
    const m = path.match(/^\/@([^/]+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fromMastodon(href: string, signal: AbortSignal): Promise<ProfileCard> {
  const card = emptyCard('Mastodon', href);
  card.labels = {
    followers: 'Followers',
    following: 'Following',
    posts: 'Posts',
  };
  card.favicon = 'https://mastodon.social/favicon.ico';

  const acct = parseMastodonAcct(href);
  if (!acct) return merge(card, await scrapeBasics(href, signal));

  const account = await fetchJson<MastoAccount>(
    `https://mastodon.social/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`,
    signal
  );
  if (!account?.username) return merge(card, await scrapeBasics(href, signal));

  const extras: ProfileCard['extras'] = [];
  if (account.bot) extras.push({ label: 'Type', value: 'Bot' });
  if (account.locked) extras.push({ label: 'Status', value: 'Locked' });
  if (account.created_at) {
    const y = new Date(account.created_at).getFullYear();
    if (!Number.isNaN(y)) extras.push({ label: 'Joined', value: String(y) });
  }
  for (const field of account.fields ?? []) {
    if (!field.name || !field.value) continue;
    const value = stripHtml(field.value);
    if (value) extras.push({ label: field.name, value });
  }

  const status = account.locked ? 'Locked account' : account.bot ? 'Bot' : null;

  return {
    ...card,
    username: account.acct || account.username,
    displayName: account.display_name || account.username || null,
    avatar: account.avatar_static || account.avatar || null,
    status,
    bio: account.note ? stripHtml(account.note) : null,
    stats: {
      followers: account.followers_count ?? null,
      following: account.following_count ?? null,
      posts: account.statuses_count ?? null,
    },
    extras,
  };
}

/* ─── YouTube ────────────────────────────────────────────────────────── */

type YtChannelList = {
  items?: {
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
    };
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
      hiddenSubscriberCount?: boolean;
    };
  }[];
};

function parseYouTubeHandle(href: string): string | null {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return null;
    const at = u.pathname.match(/^\/@([^/]+)/);
    if (at) return at[1];
    const c = u.pathname.match(/^\/(?:c|user)\/([^/]+)/);
    if (c) return c[1];
    return null;
  } catch {
    return null;
  }
}

async function fromYouTube(href: string, signal: AbortSignal): Promise<ProfileCard> {
  const card = emptyCard('YouTube', href);
  card.labels = {
    followers: 'Subscribers',
    following: 'Following',
    posts: 'Videos',
  };
  card.favicon = 'https://www.youtube.com/favicon.ico';

  const handle = parseYouTubeHandle(href);
  const key = process.env.YOUTUBE_API_KEY;

  if (key && handle) {
    const data = await fetchJson<YtChannelList>(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(key)}`,
      signal
    );
    const item = data?.items?.[0];
    if (item?.snippet) {
      const stats = item.statistics;
      const extras: ProfileCard['extras'] = [];
      if (item.snippet.customUrl)
        extras.push({ label: 'Handle', value: item.snippet.customUrl });
      if (stats?.viewCount)
        extras.push({
          label: 'Views',
          value: Number(stats.viewCount).toLocaleString('en'),
        });

      return {
        ...card,
        username: handle,
        displayName: item.snippet.title || null,
        avatar:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          null,
        status: null,
        bio: item.snippet.description?.split('\n').filter(Boolean)[0] || null,
        stats: {
          followers: stats?.hiddenSubscriberCount
            ? null
            : stats?.subscriberCount
              ? Number(stats.subscriberCount)
              : null,
          following: null,
          posts: stats?.videoCount ? Number(stats.videoCount) : null,
        },
        extras,
      };
    }
  }

  // oEmbed JSON fallback (no API key), then HTML scrape for counts.
  try {
    const oem = await fetchJson<{
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      provider_name?: string;
    }>(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(href)}`,
      signal
    );
    if (oem) {
      const basics = await scrapeBasics(href, signal);
      const scraped = await scrapeYouTubeCounts(href, signal);
      return merge(card, {
        username: handle,
        displayName: oem.author_name || oem.title || basics.displayName || null,
        avatar: oem.thumbnail_url || basics.avatar || null,
        bio: basics.bio || oem.title || null,
        favicon: card.favicon,
        stats: {
          followers: scraped.subscribers,
          following: null,
          posts: scraped.videos,
        },
      });
    }
  } catch {
    /* fall through */
  }

  const scraped = await scrapeYouTubeCounts(href, signal);
  return merge(card, {
    username: handle,
    ...(await scrapeBasics(href, signal)),
    stats: {
      followers: scraped.subscribers,
      following: null,
      posts: scraped.videos,
    },
  });
}

/** Parse "1.2K" / "3M" / "104" style counts from free text. */
function parseCompactCount(raw: string): number | null {
  const m = raw.trim().match(/^([\d,.]+)\s*([KMB])?$/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || '').toUpperCase();
  const mult = unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : unit === 'B' ? 1e9 : 1;
  return Math.round(n * mult);
}

async function scrapeYouTubeCounts(
  href: string,
  signal: AbortSignal
): Promise<{ subscribers: number | null; videos: number | null }> {
  let subscribers: number | null = null;
  let videos: number | null = null;
  try {
    const res = await fetch(href, {
      signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });
    if (!res.ok) return { subscribers, videos };
    const html = await res.text();

    const sub =
      html.match(/"content"\s*:\s*"([\d,.]+[KMB]?)\s*subscribers?"/i) ||
      html.match(/userInteractionCount"\s*:\s*"(\d+)"/i) ||
      html.match(/([\d,.]+[KMB]?)\s*subscribers?/i);
    if (sub) subscribers = parseCompactCount(sub[1]);

    const vid =
      html.match(/"content"\s*:\s*"([\d,.]+[KMB]?)\s*videos?"/i) ||
      html.match(/"videoCountText"[^]*?"content"\s*:\s*"([\d,.]+[KMB]?)/i);
    if (vid) videos = parseCompactCount(vid[1]);
  } catch {
    /* ignore */
  }
  return { subscribers, videos };
}

/* ─── LinkedIn (OG / JSON-LD only) ───────────────────────────────────── */

function parseLinkedInUsername(href: string): string | null {
  try {
    const m = new URL(href).pathname.match(/\/in\/([^/]+)/i);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

/**
 * LinkedIn og:description is an SEO frankenstein:
 * "About blurb... · Experience: X · Education: Y · Location: Z · 500+ connections on LinkedIn.
 *  View Name's profile on LinkedIn, a professional community of 1 billion members."
 * Split that into bio + extras; never surface the marketing trailer.
 */
function parseLinkedInDescription(raw: string | null): {
  about: string | null;
  extras: ProfileCard['extras'];
  connections: number | null;
  connectionsLabel: string | null;
} {
  const extras: ProfileCard['extras'] = [];
  let connections: number | null = null;
  let connectionsLabel: string | null = null;
  if (!raw?.trim()) return { about: null, extras, connections, connectionsLabel };

  let text = raw.trim();
  text = text.replace(/\s*View .+?['’]s profile on LinkedIn.*$/i, '').trim();
  text = text.replace(/\s*,?\s*a professional community of [\d.,]+\s*members\.?\s*$/i, '').trim();

  // Prefer a whole-string connections match (parts often keep a trailing period).
  const connGlobal = text.match(
    /([\d,]+)\+?\s*connections?(?:\s+on\s+LinkedIn)?/i
  );
  if (connGlobal) {
    const n = Number(connGlobal[1].replace(/,/g, ''));
    connections = Number.isFinite(n) ? n : null;
    connectionsLabel = connGlobal[0].includes('+')
      ? `${connGlobal[1]}+`
      : connGlobal[1];
  }

  const parts = text
    .split(/\s*·\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  let about: string | null = null;
  for (const part of parts) {
    const cleaned = part.replace(/[.\s]+$/u, '').trim();
    const exp = cleaned.match(/^Experience:\s*(.+)$/i);
    if (exp) {
      extras.push({ label: 'Experience', value: exp[1].trim() });
      continue;
    }
    const edu = cleaned.match(/^Education:\s*(.+)$/i);
    if (edu) {
      extras.push({ label: 'Education', value: edu[1].trim() });
      continue;
    }
    const loc = cleaned.match(/^Location:\s*(.+)$/i);
    if (loc) {
      extras.push({ label: 'Location', value: loc[1].trim() });
      continue;
    }
    const conn = cleaned.match(
      /^([\d,]+)\+?\s*connections?(?:\s+on\s+LinkedIn)?$/i
    );
    if (conn) {
      if (connections == null) {
        const n = Number(conn[1].replace(/,/g, ''));
        connections = Number.isFinite(n) ? n : null;
        connectionsLabel = cleaned.includes('+') ? `${conn[1]}+` : conn[1];
      }
      continue;
    }
    if (!about) {
      about = cleaned.replace(/\u2026\s*$/u, '').replace(/\.{2,}\s*$/, '').trim();
    }
  }

  return { about, extras, connections, connectionsLabel };
}

async function fromLinkedIn(href: string, signal: AbortSignal): Promise<ProfileCard> {
  const card = emptyCard('LinkedIn', href);
  card.labels = {
    followers: 'Connections',
    following: 'Following',
    posts: 'Posts',
  };
  card.favicon = 'https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca';

  const username = parseLinkedInUsername(href);
  const basics = await scrapeBasics(href, signal);
  const own =
    username?.toLowerCase() === 'aspauldingcode' ||
    username?.toLowerCase() ===
      resume.basics.profiles
        ?.find((p) => p.network?.toLowerCase() === 'linkedin')
        ?.username?.toLowerCase();

  // og:title → "Name - Headline | LinkedIn"
  let displayName = basics.displayName || null;
  let headline: string | null = null;
  if (displayName?.includes(' - ')) {
    const idx = displayName.indexOf(' - ');
    const name = displayName.slice(0, idx).trim();
    const rest = displayName.slice(idx + 3).replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
    displayName = name;
    headline = rest || null;
  } else if (displayName) {
    displayName = displayName.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
  }

  const parsed = parseLinkedInDescription(basics.bio ?? null);

  let bio =
    parsed.about ||
    headline ||
    (own ? resume.basics.summary?.trim() || null : null);

  if (bio && (/connections on LinkedIn/i.test(bio) || /1 billion members/i.test(bio))) {
    bio = headline || (own ? resume.basics.summary?.trim() || null : null);
  }
  if (bio && bio.length > 280) {
    bio = `${bio.slice(0, 277).replace(/\s+\S*$/, '')}...`;
  }

  let avatar = basics.avatar;
  if (!avatar && own) avatar = '/profile_square.jpg';

  const status = headline && bio && headline !== bio ? headline : null;

  const extras = [...parsed.extras];

  return {
    ...card,
    username,
    displayName: displayName || (own ? resume.basics.name : null),
    avatar: avatar ?? null,
    status,
    bio: bio ?? null,
    favicon: basics.favicon || card.favicon,
    stats: {
      followers: parsed.connections,
      following: null,
      posts: null,
    },
    extras,
  };
}

/* ─── X / Twitter (FxTwitter API + OG) ───────────────────────────────── */

function parseXUsername(href: string): string | null {
  try {
    const path = new URL(href).pathname.replace(/\/$/, '');
    const parts = path.split('/').filter(Boolean);
    if (!parts.length) return null;
    const skip = new Set(['home', 'explore', 'search', 'i', 'intent', 'share', 'hashtag']);
    if (skip.has(parts[0].toLowerCase())) return null;
    return parts[0].replace(/^@/, '');
  } catch {
    return null;
  }
}

type FxUser = {
  code?: number;
  user?: {
    screen_name?: string;
    name?: string;
    description?: string;
    avatar_url?: string;
    followers?: number;
    following?: number;
    tweets?: number;
    likes?: number;
    media_count?: number;
  };
};

async function fromX(href: string, signal: AbortSignal): Promise<ProfileCard> {
  const card = emptyCard('X', href);
  card.labels = {
    followers: 'Followers',
    following: 'Following',
    posts: 'Posts',
  };
  card.favicon = 'https://abs.twimg.com/favicons/twitter.3.ico';

  const username = parseXUsername(href);
  const basics = await scrapeBasics(href, signal);

  let displayName = basics.displayName || null;
  const m = displayName?.match(/^(.*?)\s*\(@([^)]+)\)/);
  if (m) {
    displayName = m[1].trim();
  } else if (displayName) {
    displayName = displayName.replace(/\s*\/\s*X\s*$/i, '').trim();
  }

  let stats = card.stats;
  let avatar = basics.avatar ?? null;
  let bio = basics.bio ?? null;

  if (username) {
    const fx = await fetchJson<FxUser>(
      `https://api.fxtwitter.com/${encodeURIComponent(username)}`,
      signal
    );
    const user = fx?.user;
    if (user) {
      displayName = user.name || displayName;
      bio = user.description || bio;
      avatar = user.avatar_url?.replace('_normal', '_400x400') || avatar;
      stats = {
        followers: user.followers ?? null,
        following: user.following ?? null,
        posts: user.tweets ?? null,
      };
    }
  }

  return {
    ...card,
    username: username || null,
    displayName,
    avatar,
    bio,
    favicon: basics.favicon || card.favicon,
    stats,
  };
}

/* ─── Eastern Washington University ──────────────────────────────────── */

async function fromEwu(href: string, signal: AbortSignal): Promise<ProfileCard> {
  const card = emptyCard('ewu.edu', href);
  card.favicon = 'https://www.ewu.edu/favicon.ico';
  card.papers = EWU_PUBLISHED_PAPERS;
  return merge(card, await scrapeBasics(href, signal));
}

/* ─── Router ─────────────────────────────────────────────────────────── */

export async function fetchProfileCard(
  href: string,
  signal?: AbortSignal
): Promise<ProfileCard | null> {
  const host = hostOf(href);
  if (!host) return null;

  const ac = signal ?? new AbortController().signal;

  if (host === 'github.com') return fromGitHub(href, ac);
  if (host === 'mastodon.social') return fromMastodon(href, ac);
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be')
    return fromYouTube(href, ac);
  if (host === 'linkedin.com') return fromLinkedIn(href, ac);
  if (host === 'x.com' || host === 'twitter.com' || host === 'mobile.twitter.com')
    return fromX(href, ac);
  if (isEwuPreviewHost(href)) return fromEwu(href, ac);

  const card = emptyCard(host, href);
  return merge(card, await scrapeBasics(href, ac));
}

export function formatStatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
