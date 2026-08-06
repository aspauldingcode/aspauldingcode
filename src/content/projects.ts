import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import type { MusicTrack, Project, ProjectLink, ProjectMeta } from './types';

export type { MusicTrack, Project, ProjectLink, ProjectMeta } from './types';

const workDir = path.join(process.cwd(), 'content', 'work');

function loadAll(): Project[] {
  if (!fs.existsSync(workDir)) return [];

  return fs
    .readdirSync(workDir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const slug = name.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(workDir, name), 'utf8');
      const { data, content } = matter(raw);
      const bodyHtml = marked.parse(content.trim(), { async: false }) as string;

      return {
        slug,
        title: String(data.title ?? slug),
        blurb: String(data.blurb ?? ''),
        years: String(data.years ?? ''),
        images: Array.isArray(data.images) ? data.images.map(String) : [],
        links: Array.isArray(data.links) ? (data.links as ProjectLink[]) : [],
        order: typeof data.order === 'number' ? data.order : 999,
        music: Boolean(data.music),
        tracks: Array.isArray(data.tracks) ? (data.tracks as MusicTrack[]) : undefined,
        bodyHtml,
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function getProjects(): ProjectMeta[] {
  return loadAll().map(
    ({ slug, title, blurb, years, images, links, order, music, tracks }) => ({
      slug,
      title,
      blurb,
      years,
      images,
      links,
      order,
      music,
      tracks,
    })
  );
}

export function getProjectSlugs(): string[] {
  return loadAll().map((p) => p.slug);
}

export function getProject(slug: string): Project | undefined {
  return loadAll().find((p) => p.slug === slug);
}

/** Snapshot for the home page (server). */
export const projects: ProjectMeta[] = getProjects();
