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
    expect(robots).toContain('Disallow: /home-fragment');
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
    expect(shell).toContain('data-react-shell');
    expect(shell).toContain('/home-fragment');
    expect(shell).toContain('bootHome');
    expect(shell).not.toContain('work-html');
    expect(shell).not.toContain('dangerouslySetInnerHTML');
    const home = readFileSync(path.join(root, 'src/components/HomePage.astro'), 'utf8');
    expect(home).not.toContain('hydrate');
    expect(home).toContain("from 'astro:assets'");
    expect(home).toContain('<Image');
    expect(home).not.toMatch(/<img\b/);
    const boot = readFileSync(path.join(root, 'src/scripts/boot-home.ts'), 'utf8');
    expect(boot).toContain("import('@/scripts/work-route')");
    expect(boot).toContain('openPreparedWork');
    expect(boot).toContain('openPreparedView');
    expect(boot).toContain('a[href^="/view"]');
    expect(boot).not.toMatch(/^import .*work-route/m);
    const index = readFileSync(path.join(root, 'src/pages/index.astro'), 'utf8');
    expect(index).not.toContain('site-chrome-foot');
    const view = readFileSync(path.join(root, 'src/pages/view.astro'), 'utf8');
    expect(view).toContain('export const prerender = true');
    expect(view).toContain('EmbedViewer');
  });

  it('keeps hire-bar ARIA valid and names the graph link', () => {
    const hire = readFileSync(path.join(root, 'src/components/HireBar.astro'), 'utf8');
    expect(hire).not.toMatch(/aria-hidden(?!="true")/);
    const runtime = readFileSync(path.join(root, 'src/lib/hireMeRuntime.ts'), 'utf8');
    expect(runtime).toContain("removeAttribute('aria-hidden')");
    expect(runtime).not.toMatch(/setAttribute\('aria-hidden'[^)]*'false'/);
    expect(runtime).toContain('data-home-shell');
    expect(runtime).toContain("classList.contains('is-on')");
    const route = readFileSync(path.join(root, 'src/scripts/work-route.ts'), 'utf8');
    expect(route).toContain('[data-hire-host]');
    expect(route).toContain('[data-hire-fly]');
    const graph = readFileSync(
      path.join(root, 'src/components/ContributionGraphPanel.astro'),
      'utf8'
    );
    expect(graph).toContain('aria-label={`GitHub contribution graph');
    expect(graph).toContain('aria-hidden="true"');
  });

  it('derives sitemap lastmod from content files, not the build clock', () => {
    const home = homeLastmod(root);
    const wawona = workLastmod(root, 'wawona');
    expect(home).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(wawona).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
