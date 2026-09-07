import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detailTrail } from '@/lib/detailTrail';
import { isEwuPreviewHost, papersForUrl, papersFromResume } from '@/lib/profileCard';

const root = path.resolve(__dirname, '..');
const resume = JSON.parse(readFileSync(path.join(root, 'resume.json'), 'utf8'));
const astroConfig = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
const vercelConfig = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'));

describe('education and papers', () => {
  it('lists Eastern Washington University only, 2022-2027', () => {
    expect(resume.education).toHaveLength(1);
    const school = resume.education[0];
    expect(school.institution).toBe('Eastern Washington University');
    expect(school.area).toBe('Computer Science');
    expect(school.startDate).toMatch(/^2022-/);
    expect(school.endDate).toMatch(/^2027-/);
    expect(school.studyType).toMatch(/2027/);
    expect(JSON.stringify(resume.education)).not.toMatch(/University of Montana/i);
  });

  it('lists first-place Gonzaga hackathon and Montana Capture The Flag', () => {
    const titles = (resume.awards ?? []).map((row) => row.title);
    expect(titles).toContain('First place, Gonzaga University Hackathon');
    expect(titles).toContain('First place, Spring Cyber Capture The Flag');
    const ctf = resume.awards.find((row) => row.title.includes('Capture The Flag'));
    expect(ctf.awarder).toBe('University of Montana Missoula College');
    expect(ctf.date).toMatch(/^2024-05/);
    const hack = resume.awards.find((row) => row.title.includes('Gonzaga'));
    expect(hack.awarder).toBe('Gonzaga University');
    expect(hack.date).toMatch(/^2025-11/);
  });

  it('lists both University of Montana IT Technology Educator stints', () => {
    const umit = (resume.work ?? []).filter((job) => job.name === 'University of Montana IT');
    expect(umit).toHaveLength(2);
    expect(umit.every((job) => job.position === 'Technology Educator and Consultant')).toBe(true);
    expect(umit.map((job) => [job.startDate, job.endDate])).toEqual([
      ['2024-10-01', '2025-01-31'],
      ['2020-09-01', '2020-10-31'],
    ]);
  });

  it('keeps overlay crumbs to section and current', () => {
    const items = detailTrail('Experience', 'Sunburst Sensors');
    expect(items.map((row) => row.label)).toEqual(['Experience', 'Sunburst Sensors']);
    expect(items[0].href).toMatch(/#/);
  });

  it('maps the symposium poster onto EWU preview cards', () => {
    const papers = papersFromResume();
    expect(papers.length).toBeGreaterThan(0);
    expect(papers[0].title).toMatch(/Wawona/);
    expect(papers[0].href).toMatch(/^https:\/\/dc\.ewu\.edu\//);
    expect(papers[0].image).toBe('/ewu/symposium-2026-alex-poster.avif');
    expect(existsSync(path.join(root, 'public', 'ewu', 'symposium-2026-alex-poster.avif'))).toBe(
      true
    );
    expect(isEwuPreviewHost('https://www.ewu.edu/')).toBe(true);
    expect(papersForUrl('https://www.ewu.edu/').length).toBe(papers.length);
    expect(papersForUrl('https://github.com/aspauldingcode')).toEqual([]);
  });
});

describe('resume PDF', () => {
  it('keeps a committed CalVer PDF and redirects /resume to it', () => {
    const meta = JSON.parse(
      readFileSync(path.join(root, 'src/lib/resumePdf.json'), 'utf8')
    );
    expect(meta.version).toMatch(/^v\d{4}\.\d{2}\.\d{2}$/);
    expect(existsSync(path.join(root, 'public', meta.filename))).toBe(true);
    expect(astroConfig).toMatch(/['"]\/resume['"]/);
    expect(astroConfig).toMatch(/['"]\/resume\.pdf['"]/);
    expect(astroConfig).toContain('resumePdf.href');
    expect(astroConfig).toMatch(/['"]\/projects['"]/);
    expect(vercelConfig.redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/:path*',
          destination: 'https://www.aspauldingcode.com/:path*',
          permanent: true,
        }),
        expect.objectContaining({
          source: '/projects/:path*',
          destination: '/',
          permanent: true,
        }),
      ])
    );
    expect(vercelConfig.redirects.some((row: { source: string }) => row.source === '/resume')).toBe(
      false
    );
    expect(vercelConfig.redirects.some((row: { source: string }) => row.source === '/projects')).toBe(
      false
    );
  });
});

describe('site lab scores', () => {
  it('publishes bench search and speed scores in the profile README', () => {
    const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
    const bench = JSON.parse(readFileSync(path.join(root, 'bench/latest.json'), 'utf8'));
    expect(bench.seoScore).toBe(100);
    expect(bench.speedScore).toBe(100);
    expect(readme).toContain('Search engine optimization (SEO)');
    expect(readme).toContain('100 / 100');
    expect(readme).toContain('21 KB');
    expect(readme).toContain('portfolio_SEO-100');
    expect(readme).toContain('portfolio_speed-100');
    expect(readme).not.toMatch(/speed-69/);
    expect(readme).toContain('actions/workflows/resume.yml');
  });
});

describe('site footer', () => {
  it('opens the GitHub source repo in a new tab, not the in-site viewer', () => {
    const footer = readFileSync(
      path.join(root, 'src/components/SiteFooter.tsx'),
      'utf8'
    );
    expect(footer).toContain('https://github.com/aspauldingcode/aspauldingcode');
    expect(footer).toContain('target="_blank"');
    expect(footer).toContain('rel="noopener noreferrer"');
    expect(footer).not.toMatch(/viewHref/);
  });
});
