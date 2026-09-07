import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkResume,
  parseResumeFile,
  validateResume,
} from '../scripts/validate-resume.mjs';

const root = path.resolve(__dirname, '..');
const resumePath = path.join(root, 'resume.json');

describe('resume.json', () => {
  it('parses and passes JSON Resume plus house rules', () => {
    const issues = checkResume();
    expect(issues).toEqual([]);
  });

  it('reports a parse failure instead of throwing', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'resume-'));
    const broken = path.join(dir, 'resume.json');
    writeFileSync(broken, '{ "basics": ');
    const parsed = parseResumeFile(broken);
    expect(parsed.ok).toBe(false);
    expect(parsed.issues[0]).toMatch(/parse failure/);
  });

  it('fails JSON Resume compliance on empty dates and unknown root keys', () => {
    const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
    resume.notAResumeField = true;
    resume.work = [{ ...resume.work[0], endDate: '' }];
    const issues = validateResume(resume);
    expect(issues.some((row) => row.includes('not a JSON Resume'))).toBe(true);
    expect(issues.some((row) => row.includes('omit empty date'))).toBe(true);
  });

  it('fails when education or University of Montana drift', () => {
    const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
    resume.education = [
      {
        institution: 'University of Montana',
        area: 'CS',
        startDate: '2023-01-01',
        endDate: '2026-01-01',
        studyType: 'Bachelor',
      },
    ];
    const issues = validateResume(resume);
    expect(issues.some((row) => /University of Montana/.test(row))).toBe(true);
    expect(issues.some((row) => /Computer Science/.test(row))).toBe(true);
  });
});
