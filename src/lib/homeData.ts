import { getProject } from '@/content/projects';
import {
  alsoSeeSlugs,
  awardsByYear,
  formatYearRange,
  resume,
  resumeSelectedWork,
  yearOf,
  type ResumeProject,
} from '@/content/resume';
import { formatProjectStars } from '@/lib/projectStars';
import { projectImageAlt } from '@/lib/seo';
import { viewHref } from '@/lib/viewHref';

export type HomeGalleryItem = {
  slug: string;
  title: string;
  years: string;
  blurb: string;
  starLabel: string | null;
  thumb: string;
  thumbAlt: string;
};

export type HomeAlsoLink = {
  key: string;
  href?: string;
  label: string;
};

export type HomeModel = {
  name: string;
  label?: string;
  summary?: string;
  galleryWork: HomeGalleryItem[];
  alsoLinks: HomeAlsoLink[];
  githubProfile: string;
  githubProfileLabel: string;
  githubViewHref: string;
  education: {
    institution: string;
    href?: string;
    when: string;
    line: string;
    score?: string;
    key: string;
  }[];
  experience: {
    title: string;
    href?: string;
    when: string;
    highlights: string[];
    key: string;
  }[];
  skills: { name?: string; words: string; key: string }[];
  awards: { line: string; href?: string; key: string }[];
  profiles: { network: string; url: string }[];
  hasEducation: boolean;
  hasExperience: boolean;
  hasSkills: boolean;
  hasAwards: boolean;
};

export function homeModel(): HomeModel {
  const { basics } = resume;
  const selectedWork = resumeSelectedWork();
  const galleryWork = selectedWork
    .filter((w) => w.kind === 'gallery')
    .map((entry) => {
      const project = getProject(entry.slug);
      if (!project) return null;
      const years =
        project.years ||
        formatYearRange(entry.resume.startDate, entry.resume.endDate || undefined);
      const blurb = project.blurb || entry.resume.description || '';
      const starLabel = formatProjectStars([
        ...project.links.map((link) => link.href),
        entry.resume.url,
      ]);
      return {
        slug: project.slug,
        title: project.title,
        years,
        blurb,
        starLabel,
        thumb: project.images[0],
        thumbAlt: projectImageAlt(project, 0),
      };
    })
    .filter((row): row is HomeGalleryItem => Boolean(row));

  const alsoProjects = selectedWork.filter((w) => w.kind === 'text');
  const alsoSee = alsoSeeSlugs()
    .map((slug) => getProject(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const alsoLinks: HomeAlsoLink[] = [
    ...alsoSee.map((project) => ({
      key: project.slug,
      href: `/work/${project.slug}`,
      label: project.title,
    })),
    ...alsoProjects.map((entry: { resume: ResumeProject }) => ({
      key: entry.resume.name,
      href: entry.resume.url ? viewHref(entry.resume.url) : undefined,
      label: entry.resume.name,
    })),
  ];

  const githubProfile =
    (basics.profiles ?? []).find((p) => p.network?.toLowerCase() === 'github')?.url ||
    'https://github.com/aspauldingcode';

  const education = (resume.education ?? []).map((ed) => ({
    institution: ed.institution,
    href: ed.url ? viewHref(ed.url) : undefined,
    when: formatYearRange(ed.startDate, ed.endDate),
    line: [ed.studyType, ed.area].filter(Boolean).join(', '),
    score: ed.score,
    key: `${ed.institution}-${ed.startDate}`,
  }));

  const experience = (resume.work ?? []).map((job) => ({
    title: [job.position, job.name].filter(Boolean).join(', '),
    href: job.url ? viewHref(job.url) : undefined,
    when: formatYearRange(job.startDate, job.endDate),
    highlights: job.highlights ?? [],
    key: `${job.name}-${job.startDate}`,
  }));

  const skills = (resume.skills ?? [])
    .map((skill) => {
      const words = (skill.keywords ?? []).join(', ');
      if (!words) return null;
      return { name: skill.name, words, key: skill.name ?? words };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const awards = awardsByYear().map((award) => {
    const bits = [award.title, award.awarder].filter(Boolean).join(' / ');
    const y = yearOf(award.date);
    return {
      line: `${bits}${y ? ` (${y})` : ''}`,
      href: award.url,
      key: `${award.title}-${award.date}`,
    };
  });

  const profiles = (basics.profiles ?? []).filter(
    (p): p is { network: string; url: string } => Boolean(p.url)
  );

  return {
    name: basics.name,
    label: basics.label,
    summary: basics.summary,
    galleryWork,
    alsoLinks,
    githubProfile,
    githubProfileLabel: githubProfile.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    githubViewHref: viewHref(githubProfile),
    education,
    experience,
    skills,
    awards,
    profiles,
    hasEducation: education.length > 0,
    hasExperience: experience.length > 0,
    hasSkills: skills.length > 0,
    hasAwards: awards.length > 0,
  };
}
