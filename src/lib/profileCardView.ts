/**
 * Client-safe profile card helpers. Do not import linkpeek or scrape code here.
 * EmbedViewer loads this module. Server fetch stays in profileCard.ts.
 */

import { resume } from '@/content/resume';

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

export type ProfilePin = {
  name: string;
  href: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number | null;
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
  stats: {
    followers: number | null;
    following: number | null;
    posts: number | null;
  };
  labels: {
    followers: string;
    following: string;
    posts: string;
  };
  extras: { label: string; value: string }[];
  papers: ProfilePaper[];
  pins: ProfilePin[];
};

export const EWU_SYMPOSIUM_HREF = 'https://dc.ewu.edu/srcw_2026/';

export const VIEW_EVENT = 'aspauldingcode:view';

function hostOf(href: string): string | null {
  try {
    return new URL(href).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

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

export function formatStatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
