import { resume } from '@/content/resume';
import type { ProjectMeta } from '@/content/types';

export const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.aspauldingcode.com').replace(
  /\/$/,
  ''
);

export const SITE_NAME = resume.basics.name;
export const SITE_HANDLE = '@aspauldingcode';
export const DEFAULT_OG_IMAGE = '/profile_square.jpg';

export type SeoMeta = {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: string;
  ogType?: string;
  ogImage?: string;
  ogImageAlt?: string;
  keywords?: string[];
};

export function absoluteUrl(path = '/'): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

export function siteDescription(): string {
  return (
    resume.basics.summary ??
    'Systems software engineer building Wayland compositors, macOS and iOS runtime tooling, and Nix-based infrastructure.'
  );
}

const profileUrls = (resume.basics.profiles ?? [])
  .map((p) => p.url)
  .filter((u): u is string => Boolean(u));

export function defaultKeywords(): string[] {
  const skills =
    resume.skills?.flatMap((s) => s.keywords ?? (s.name ? [s.name] : [])) ?? [];
  return [
    SITE_NAME,
    'aspauldingcode',
    'systems software',
    'Wayland compositor',
    'Wawona',
    'macOS',
    'iOS',
    'Nix',
    'reverse engineering',
    'Eastern Washington University',
    ...skills.slice(0, 24),
  ];
}

export function rootSeo(): SeoMeta {
  return {
    title: `${SITE_NAME} / ${resume.basics.label ?? 'Systems Software'}`,
    description: siteDescription(),
    canonicalPath: '/',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: `${SITE_NAME} portrait photo`,
    keywords: defaultKeywords(),
  };
}

export function projectDocumentTitle(project: Pick<ProjectMeta, 'slug' | 'title'>): string {
  if (project.slug === 'wawona') {
    return 'Wawona: native Wayland compositor for macOS';
  }
  if (project.slug === 'whisperer') {
    return 'Whisperer: ChatGPT for Apple Watch';
  }
  return project.title;
}

export function projectKeywords(project: ProjectMeta): string[] {
  const years = project.years.split(/[^\w]+/).filter(Boolean);
  const base = [project.title, SITE_NAME, 'portfolio', 'selected work', ...years];
  if (project.slug === 'wawona') {
    return [
      ...base,
      'Wayland',
      'compositor',
      'macOS',
      'iOS',
      'Android',
      'Wawona',
      'Alex Spaulding',
    ];
  }
  if (project.slug === 'whisperer') {
    return [
      ...base,
      'ChatGPT',
      'Apple Watch',
      'watchOS',
      'Whisperer',
      'voice',
      'Alex Spaulding',
    ];
  }
  return base;
}

export function projectSeo(project: ProjectMeta): SeoMeta {
  const title = projectDocumentTitle(project);
  const path = `/work/${project.slug}`;
  const image = project.images[0] || DEFAULT_OG_IMAGE;
  return {
    title,
    description: project.blurb,
    canonicalPath: path,
    ogType: 'article',
    ogImage: image,
    ogImageAlt: projectImageAlt(project, 0),
    keywords: projectKeywords(project),
  };
}

export function humanizeImageStem(src: string): string {
  const file = src.split('/').pop() ?? src;
  return file
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Prefer frontmatter `imageAlts`; else project title + humanized filename. */
export function projectImageAlt(
  project: Pick<ProjectMeta, 'title' | 'images' | 'imageAlts'>,
  index: number
): string {
  const explicit = project.imageAlts?.[index]?.trim();
  if (explicit) return explicit;
  const src = project.images[index];
  if (!src) return project.title;
  const stem = humanizeImageStem(src);
  const n = project.images.length;
  if (n <= 1) return `${project.title}: ${stem}`;
  return `${project.title}: ${stem} (${index + 1} of ${n})`;
}

export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: SITE_NAME,
    url: SITE_URL,
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    jobTitle: resume.basics.label ?? undefined,
    description: siteDescription(),
    address: resume.basics.location
      ? {
          '@type': 'PostalAddress',
          addressLocality: resume.basics.location.city,
          addressRegion: resume.basics.location.region,
          addressCountry: resume.basics.location.countryCode,
        }
      : undefined,
    sameAs: profileUrls,
    alumniOf: (resume.education ?? []).map((ed) => ({
      '@type': 'CollegeOrUniversity',
      name: ed.institution,
      url: ed.url,
    })),
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: siteDescription(),
    publisher: { '@id': `${SITE_URL}/#person` },
    inLanguage: 'en-US',
  };
}

export function profilePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${SITE_URL}/#profilepage`,
    url: SITE_URL,
    name: `${SITE_NAME} portfolio`,
    description: siteDescription(),
    mainEntity: { '@id': `${SITE_URL}/#person` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };
}

export function projectJsonLd(project: ProjectMeta) {
  const image = project.images[0] ? absoluteUrl(project.images[0]) : undefined;
  const isApp = project.slug === 'whisperer';
  return {
    '@context': 'https://schema.org',
    '@type': isApp ? 'SoftwareApplication' : 'CreativeWork',
    '@id': absoluteUrl(`/work/${project.slug}#work`),
    name: projectDocumentTitle(project),
    alternateName: project.title,
    description: project.blurb,
    url: absoluteUrl(`/work/${project.slug}`),
    image,
    author: { '@id': `${SITE_URL}/#person` },
    creator: { '@id': `${SITE_URL}/#person` },
    dateCreated: project.years.split(/[-]/)[0]?.trim() || undefined,
    keywords: projectKeywords(project).join(', '),
    ...(isApp
      ? {
          applicationCategory: 'LifestyleApplication',
          operatingSystem: 'watchOS, iOS',
        }
      : {}),
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; path?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: absoluteUrl(c.path) } : {}),
    })),
  };
}

export function jsonLdScript(data: object | object[]): string {
  const items = (Array.isArray(data) ? data : [data]).filter(
    (item): item is object => Boolean(item) && typeof item === 'object'
  );
  const body =
    items.length === 1
      ? items[0]
      : {
          '@context': 'https://schema.org',
          '@graph': items.map((item) => {
            const rec = item as Record<string, unknown>;
            if (!('@context' in rec)) return item;
            const { '@context': _ctx, ...rest } = rec;
            return rest;
          }),
        };
  return JSON.stringify(body).replace(/</g, '\\u003c');
}
