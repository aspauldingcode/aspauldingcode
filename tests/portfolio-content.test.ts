import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { isEwuPreviewHost, papersForUrl, papersFromResume } from '@/lib/profileCard';

const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const resume = JSON.parse(readFileSync(path.join(root, 'resume.json'), 'utf8'));
const nextConfig = require(path.join(root, 'next.config.js'));

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

  it('maps the symposium poster onto EWU preview cards', () => {
    const papers = papersFromResume();
    expect(papers.length).toBeGreaterThan(0);
    expect(papers[0].title).toMatch(/Wawona/);
    expect(papers[0].href).toMatch(/^https:\/\/dc\.ewu\.edu\//);
    expect(papers[0].image).toBe('/ewu/symposium-2026-alex-poster.jpg');
    expect(existsSync(path.join(root, 'public', 'ewu', 'symposium-2026-alex-poster.jpg'))).toBe(
      true
    );
    expect(isEwuPreviewHost('https://www.ewu.edu/')).toBe(true);
    expect(papersForUrl('https://www.ewu.edu/').length).toBe(papers.length);
    expect(papersForUrl('https://github.com/aspauldingcode')).toEqual([]);
  });
});

describe('resume PDF', () => {
  it('keeps a committed PDF and redirects /resume to it', async () => {
    expect(existsSync(path.join(root, 'public', 'resume.pdf'))).toBe(true);
    const redirects = await nextConfig.redirects();
    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/resume',
          destination: '/resume.pdf',
          permanent: true,
        }),
      ])
    );
  });
});
