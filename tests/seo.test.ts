import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  personJsonLd,
  projectDocumentTitle,
  projectJsonLd,
  SITE_URL,
} from '@/lib/seo';
import { getProject } from '@/content/projects';
import { homeLastmod, workLastmod } from '@/lib/contentMtime';

const root = path.resolve(__dirname, '..');

describe('SEO', () => {
  it('canonical host is www and sitemap matches', () => {
    expect(SITE_URL).toBe('https://www.aspauldingcode.com');
    const sitemap = readFileSync(path.join(root, 'src/pages/sitemap.xml.ts'), 'utf8');
    expect(sitemap).toContain('SITE_URL');
    expect(sitemap).toContain('/work/');
    expect(sitemap).not.toContain('/view');
    expect(sitemap).toContain('homeLastmod');
    expect(sitemap).toContain('workLastmod');
    expect(sitemap).not.toMatch(/new Date\(\)\.toISOString\(\)/);
    const robots = readFileSync(path.join(root, 'src/pages/robots.txt.ts'), 'utf8');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Disallow: /view');
  });

  it('does not emit email in Person JSON-LD', () => {
    const person = personJsonLd() as Record<string, unknown>;
    expect(person.email).toBeUndefined();
    expect(JSON.stringify(person)).not.toMatch(/mailto:/);
  });

  it('shapes Wawona and Whisperer titles for the queries they should win', () => {
    const wawona = getProject('wawona');
    const whisperer = getProject('whisperer');
    expect(wawona).toBeTruthy();
    expect(whisperer).toBeTruthy();
    expect(projectDocumentTitle(wawona!)).toMatch(/Wayland compositor for macOS/i);
    expect(projectDocumentTitle(whisperer!)).toMatch(/ChatGPT for Apple Watch/i);
    expect(projectJsonLd(wawona!).keywords).toMatch(/Wayland/);
    expect(projectJsonLd(whisperer!)['@type']).toBe('SoftwareApplication');
  });

  it('work pages are unique documents, not a homepage dump', () => {
    const page = readFileSync(path.join(root, 'src/pages/work/[slug].astro'), 'utf8');
    expect(page).toContain('project-detail');
    expect(page).not.toContain('HomePage');
    expect(page).toContain('SplitShell');
    const shell = readFileSync(path.join(root, 'src/components/SplitShell.tsx'), 'utf8');
    expect(shell).toContain('showHome');
  });

  it('derives sitemap lastmod from content files, not the build clock', () => {
    const home = homeLastmod(root);
    const wawona = workLastmod(root, 'wawona');
    expect(home).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(wawona).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
