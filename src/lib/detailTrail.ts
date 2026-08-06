import { resume } from '@/content/resume';
import { sectionId } from '@/lib/sectionId';

export type CrumbItem = {
  label: string;
  /** Omit on the current page crumb. */
  href?: string;
};

export function homeCrumb(): CrumbItem {
  return { label: resume.basics.name, href: '/' };
}

export function sectionCrumb(section: string): CrumbItem {
  return { label: section, href: `/#${sectionId(section)}` };
}

function hostOf(href: string): string | null {
  try {
    return new URL(href).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/** True when `candidate` is the same site path (or a parent path) as `target`. */
function urlRelated(candidate: string, target: string): boolean {
  try {
    const a = new URL(candidate);
    const b = new URL(target);
    if (a.protocol !== 'https:' && a.protocol !== 'http:') return false;
    if (b.protocol !== 'https:' && b.protocol !== 'http:') return false;
    const ah = a.hostname.replace(/^www\./, '').toLowerCase();
    const bh = b.hostname.replace(/^www\./, '').toLowerCase();
    if (ah !== bh) return false;
    const ap = a.pathname.replace(/\/$/, '') || '/';
    const bp = b.pathname.replace(/\/$/, '') || '/';
    return bp === ap || bp.startsWith(`${ap}/`);
  } catch {
    return false;
  }
}

function labelFromUrl(href: string): string {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname === '/' ? '' : u.pathname;
    return `${host}${path}${u.search}`;
  } catch {
    return href;
  }
}

/**
 * Infer home-section trail for an in-pane `/view` URL from resume data.
 * Falls back to Links (where external profiles live).
 */
export function trailForViewUrl(
  openHref: string,
  opts?: { siteName?: string | null; title?: string | null }
): { section: string; current: string } {
  if (openHref.startsWith('/') && !openHref.startsWith('//')) {
    return { section: 'Links', current: openHref };
  }

  for (const job of resume.work ?? []) {
    if (job.url && urlRelated(job.url, openHref)) {
      return {
        section: 'Experience',
        current: job.name || opts?.siteName || labelFromUrl(openHref),
      };
    }
  }

  for (const ed of resume.education ?? []) {
    if (ed.url && urlRelated(ed.url, openHref)) {
      return {
        section: 'Education',
        current: ed.institution || opts?.siteName || labelFromUrl(openHref),
      };
    }
  }

  for (const project of resume.projects ?? []) {
    if (project.url && urlRelated(project.url, openHref)) {
      return {
        section: 'Selected work',
        current: project.name || opts?.siteName || labelFromUrl(openHref),
      };
    }
  }

  const host = hostOf(openHref);
  if (host === 'github.com') {
    try {
      const path = new URL(openHref).pathname.toLowerCase();
      if (path === '/aspauldingcode' || path.startsWith('/aspauldingcode/')) {
        return { section: 'GitHub', current: opts?.siteName || 'GitHub' };
      }
    } catch {
      /* fall through */
    }
  }

  if (
    host === 'open.spotify.com' ||
    host === 'spotify.com' ||
    host === 'music.apple.com' ||
    host === 'embed.music.apple.com'
  ) {
    return {
      section: 'Selected work',
      current: opts?.siteName || opts?.title || 'Listen',
    };
  }

  for (const profile of resume.basics.profiles ?? []) {
    if (profile.url && urlRelated(profile.url, openHref)) {
      return {
        section: 'Links',
        current: profile.network || opts?.siteName || labelFromUrl(openHref),
      };
    }
  }

  if (resume.basics.url && urlRelated(resume.basics.url, openHref)) {
    return {
      section: 'Links',
      current: opts?.siteName || 'Website',
    };
  }

  return {
    section: 'Links',
    current:
      opts?.siteName ||
      opts?.title ||
      labelFromUrl(openHref),
  };
}

/** Name / Section / Current */
export function detailTrail(
  section: string,
  current: string
): CrumbItem[] {
  return [homeCrumb(), sectionCrumb(section), { label: current }];
}
