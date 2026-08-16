import data from '../../public/github/project-stars.json';

export type ProjectStarsFile = {
  generatedAt?: string;
  repos: Record<string, { stars: number; url: string }>;
};

const stars = data as ProjectStarsFile;

const SKIP_OWNERS = new Set([
  'features',
  'topics',
  'collections',
  'trending',
  'events',
  'sponsors',
  'settings',
  'marketplace',
  'orgs',
  'organizations',
  'pulls',
  'issues',
  'explore',
  'notifications',
  'login',
  'join',
]);

/** owner/repo, lowercased. Null if the URL is not a repository. */
export function githubRepoKey(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.hostname.replace(/^www\./, '').toLowerCase() !== 'github.com') {
      return null;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');
    if (!owner || !repo || SKIP_OWNERS.has(owner.toLowerCase())) return null;
    if (repo === 'issues' || repo === 'pulls' || repo === 'actions') return null;
    return `${owner}/${repo}`.toLowerCase();
  } catch {
    return null;
  }
}

export function starsForHref(href: string | null | undefined): number | null {
  if (!href) return null;
  const key = githubRepoKey(href);
  if (!key) return null;
  const row = stars.repos?.[key];
  return typeof row?.stars === 'number' && row.stars > 0 ? row.stars : null;
}

export function starsForHrefs(hrefs: Array<string | null | undefined>): number | null {
  for (const href of hrefs) {
    const count = starsForHref(href);
    if (count != null) return count;
  }
  return null;
}

export function formatStarCount(count: number): string {
  const n = Math.round(count);
  const grouped = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n === 1 ? '1 star' : `${grouped} stars`;
}

export function formatProjectStars(
  hrefs: Array<string | null | undefined>
): string | null {
  const count = starsForHrefs(hrefs);
  return count == null ? null : formatStarCount(count);
}
