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
  if (!end) return `${a} - present`;
  return `${a} - ${yearOf(end)}`;
}

/** Map resume project names to portfolio `/work/[slug]` pages when they exist. */
const WORK_SLUGS: Record<string, string> = {
  Wawona: 'wawona',
  'apple-sharpener': 'apple-sharpener',
  Whisperer: 'whisperer',
};

export function workSlugForResumeProject(name: string): string | undefined {
  return WORK_SLUGS[name];
}

/** Resume projects that have no site gallery page (shown as an "Also" line). */
export function resumeOnlyProjects(): ResumeProject[] {
  return (resume.projects ?? []).filter((p) => !workSlugForResumeProject(p.name));
}
