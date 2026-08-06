import type { Metadata } from 'next';
import { resume } from '@/content/resume';
import type { ProjectMeta } from '@/content/types';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://aspauldingcode.com'
).replace(/\/$/, '');

export const SITE_NAME = resume.basics.name;
export const SITE_HANDLE = '@aspauldingcode';
export const DEFAULT_OG_IMAGE = '/profile_square.jpg';

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

/** Shared root metadata pieces for Open Graph / Twitter / robots. */
export function rootMetadata(): Metadata {
  const title = `${SITE_NAME} / ${resume.basics.label ?? 'Systems Software'}`;
  const description = siteDescription();
  const ogImage = absoluteUrl(DEFAULT_OG_IMAGE);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s / ${SITE_NAME}`,
    },
    description,
    keywords: defaultKeywords(),
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    applicationName: SITE_NAME,
    category: 'technology',
    referrer: 'origin-when-cross-origin',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: SITE_URL,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 1200,
          alt: `${SITE_NAME} portrait photo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SITE_HANDLE,
      images: [
        {
          url: ogImage,
          alt: `${SITE_NAME} portrait photo`,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: {
      icon: [{ url: '/favicon.ico', sizes: 'any' }],
      apple: [{ url: DEFAULT_OG_IMAGE }],
    },
  };
}

export function projectMetadata(project: ProjectMeta): Metadata {
  const title = project.title;
  const description = project.blurb;
  const path = `/work/${project.slug}`;
  const image = project.images[0]
    ? absoluteUrl(project.images[0])
    : absoluteUrl(DEFAULT_OG_IMAGE);
  const imageAlt = projectImageAlt(project, 0);

  return {
    title,
    description,
    keywords: [
      project.title,
      SITE_NAME,
      'portfolio',
      'selected work',
      ...project.years.split(/[^\w]+/).filter(Boolean),
    ],
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      url: absoluteUrl(path),
      title: `${project.title} / ${SITE_NAME}`,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} / ${SITE_NAME}`,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
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
    email: resume.basics.email ? `mailto:${resume.basics.email}` : undefined,
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
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': absoluteUrl(`/work/${project.slug}#work`),
    name: project.title,
    description: project.blurb,
    url: absoluteUrl(`/work/${project.slug}`),
    image,
    author: { '@id': `${SITE_URL}/#person` },
    creator: { '@id': `${SITE_URL}/#person` },
    dateCreated: project.years.split(/[-–]/)[0]?.trim() || undefined,
    keywords: project.title,
  };
}

export function breadcrumbJsonLd(
  crumbs: { name: string; path?: string }[]
) {
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
