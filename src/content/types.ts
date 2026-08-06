export type ProjectLink = { label: string; href: string };

export type MusicTrack = {
  id: string;
  title: string;
  starred?: boolean;
};

export type ProjectMeta = {
  slug: string;
  title: string;
  blurb: string;
  years: string;
  images: string[];
  /** Parallel to `images` — descriptive alt text for SEO / a11y. */
  imageAlts?: string[];
  links: ProjectLink[];
  order: number;
  music?: boolean;
  tracks?: MusicTrack[];
};

export type Project = ProjectMeta & {
  bodyHtml: string;
};
