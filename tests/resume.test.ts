import { inflateSync } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RESUME_CALVER_RE,
  publicResumePdfPath,
  readResumePdfMeta,
  resumeCalVer,
} from '../scripts/resumeCalver.mjs';
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

  it('fails when prose is missing a closing period', () => {
    const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
    resume.projects[0].description = 'Native Wayland for macOS, iOS, and Android';
    resume.work[0].highlights[0] = 'Native Wayland compositor for macOS, iOS, and Android';
    const issues = validateResume(resume);
    expect(issues.some((row) => row.includes('description must end with a period'))).toBe(true);
    expect(issues.some((row) => row.includes('highlights[0] must end with a period'))).toBe(true);
  });

  it('keeps PDF section titles and job names flush left', () => {
    const pdf = readFileSync(path.join(root, 'scripts/export-resume.mjs'), 'utf8');
    expect(pdf).toContain('const atLeft = () => {');
    expect(pdf).toContain('indentedBody');
    expect(pdf).toContain('.text(title.toUpperCase(), leftX, doc.y');
    expect(pdf).toContain('.text(left, leftX, y0');

    const raw = readFileSync(publicResumePdfPath(root, readResumePdfMeta(root)));
    const runs = pdfTextRuns(raw);
    const left = 48;
    const indent = 60;
    for (const label of [
      'EXPERIENCE',
      'SELECTED WORK',
      'Founder and Lead Engineer, Wawona',
      'Assembly Technician, Sunburst Sensors',
      'Technology Educator and Consultant, University of Montana IT',
      'Wawona',
      'apple-sharpener',
      'Whisperer',
    ]) {
      const hit = runs.find((row) => row.text.startsWith(label));
      expect(hit, label).toBeTruthy();
      expect(hit?.x, label).toBe(left);
    }
    const sub = runs.find((row) => row.text.startsWith('Native Wayland for macOS'));
    expect(sub?.x).toBe(indent);
  });

  it('names the PDF with quirky CalVer vYYYY.MM.DD', () => {
    expect(resumeCalVer(new Date(2026, 8, 7))).toBe('v2026.09.07');
    const meta = readResumePdfMeta(root);
    expect(meta.version).toMatch(RESUME_CALVER_RE);
    expect(meta.filename).toBe(`Alex-Spaulding-${meta.version}.pdf`);
    expect(meta.href).toBe(`/${meta.filename}`);
    expect(existsSync(publicResumePdfPath(root, meta))).toBe(true);
  });
});

function pdfTextRuns(raw: Buffer): { x: number; text: string }[] {
  const chunks: Buffer[] = [];
  const src = raw.toString('latin1');
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const bytes = Buffer.from(m[1] ?? '', 'latin1');
    try {
      chunks.push(inflateSync(bytes));
    } catch {
      try {
        chunks.push(inflateSync(Buffer.from(bytes.toString('utf8').trim(), 'latin1')));
      } catch {
        /* not a flate stream */
      }
    }
  }
  const text = Buffer.concat(chunks).toString('latin1');
  const blocks = text.split('BT\n').slice(1);
  const runs: { x: number; text: string }[] = [];
  for (const block of blocks) {
    const tm = block.match(/1 0 0 1 ([0-9.\-]+) [0-9.\-]+ Tm/);
    const tj = block.match(/\[([\s\S]*?)\] TJ/);
    if (!tm || !tj) continue;
    const hex = [...tj[1].matchAll(/<([0-9A-Fa-f]+)>/g)].map((row) => row[1]);
    const decoded = Buffer.from(hex.join(''), 'hex').toString('latin1');
    if (decoded) runs.push({ x: Number(tm[1]), text: decoded });
  }
  return runs;
}
