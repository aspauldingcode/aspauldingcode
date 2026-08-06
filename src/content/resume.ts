import resumeData from '../../resume.json';

export type ResumeProfile = {
  network: string;
  username?: string;
  url?: string;
};

export type ResumeWork = {
  name: string;
  position: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  location?: string;
  highlights?: string[];
};

export type ResumeEducation = {
  institution: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
};

export type ResumeAward = {
  title: string;
  date?: string;
  awarder?: string;
  summary?: string;
};

export type ResumeSkill = {
  name?: string;
  keywords?: string[];
};

export type ResumeProject = {
  name: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
};

export type Resume = {
  basics: {
    name: string;
    label?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: {
      city?: string;
      region?: string;
      countryCode?: string;
    };
    profiles?: ResumeProfile[];
  };
  work?: ResumeWork[];
  education?: ResumeEducation[];
  awards?: ResumeAward[];
  skills?: ResumeSkill[];
  projects?: ResumeProject[];
};

export const resume = resumeData as Resume;

/** Awards newest-first by date. */
export function awardsByYear(): ResumeAward[] {
  return [...(resume.awards ?? [])].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || ''))
  );
}

export function yearOf(iso?: string): string {
  if (!iso) return '';
  return String(iso).slice(0, 4);
}

export function formatYearRange(start?: string, end?: string): string {
  const a = yearOf(start);
  if (!a) return '';
  if (!end) return `${a}-present`;
  return `${a}-${yearOf(end)}`;
}

/** Map resume project names to portfolio `/work/[slug]` pages when they exist. */
const WORK_SLUGS: Record<string, string> = {
  Wawona: 'wawona',
  'apple-sharpener': 'apple-sharpener',
  Whisperer: 'whisperer',
  'ModernOrange Band': 'modernorange-band',
  ModernOrange: 'modernorange-band',
  'Sentinel High School Computer Building Club': 'sentinel-pc-building-club',
  'Sentinel PC Building Club': 'sentinel-pc-building-club',
};

export function workSlugForResumeProject(name: string): string | undefined {
  return WORK_SLUGS[name];
}

/**
 * Selected work order follows resume.projects.
 * Gallery pages enrich when WORK_SLUGS maps; otherwise compact text entry.
 */
export function resumeSelectedWork(): Array<
  | { kind: 'gallery'; slug: string; resume: ResumeProject }
  | { kind: 'text'; resume: ResumeProject }
> {
  return (resume.projects ?? []).map((rp) => {
    const slug = workSlugForResumeProject(rp.name);
    if (slug) return { kind: 'gallery' as const, slug, resume: rp };
    return { kind: 'text' as const, resume: rp };
  });
}
