#!/usr/bin/env node
/**
 * Parse resume.json, check JSON Resume v1.0.0 shape, and apply house rules.
 * Exit 1 with one issue per line. Used by `npm run resume:check` and the Resume badge.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESUME_PATH = path.join(ROOT, 'resume.json');
const PDF_PATH = path.join(ROOT, 'public', 'resume.pdf');
const SCHEMA_HREF =
  'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json';

const ROOT_KEYS = new Set([
  '$schema',
  'basics',
  'work',
  'volunteer',
  'education',
  'awards',
  'certificates',
  'publications',
  'skills',
  'languages',
  'interests',
  'references',
  'projects',
  'meta',
]);

const ISO8601 =
  /^([1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]|[1-2][0-9]{3}-[0-1][0-9]|[1-2][0-9]{3})$/;

export function parseResumeFile(filePath = RESUME_PATH) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return { ok: false, resume: null, issues: [`cannot read ${filePath}`] };
  }
  try {
    return { ok: true, resume: JSON.parse(raw), issues: [] };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'invalid JSON';
    return { ok: false, resume: null, issues: [`resume.json parse failure: ${detail}`] };
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function walkStrings(value, visit, trail = '$') {
  if (typeof value === 'string') {
    visit(value, trail);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, visit, `${trail}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walkStrings(child, visit, `${trail}.${key}`);
    }
  }
}

function checkDate(value, trail, issues) {
  if (value == null) return;
  if (value === '') {
    issues.push(`${trail}: omit empty date (JSON Resume iso8601; missing means present)`);
    return;
  }
  if (!ISO8601.test(value)) {
    issues.push(`${trail}: not JSON Resume iso8601 (${value})`);
  }
}

function checkUrl(value, trail, issues) {
  if (value == null) return;
  if (value === '') {
    issues.push(`${trail}: omit empty url (JSON Resume uri)`);
    return;
  }
  if (!isHttpUrl(value)) {
    issues.push(`${trail}: not an http(s) uri (${value})`);
  }
}

export function validateResume(resume, opts = {}) {
  const issues = [];
  const pdfPath = opts.pdfPath ?? PDF_PATH;

  if (!resume || typeof resume !== 'object' || Array.isArray(resume)) {
    return ['resume.json must be a JSON object'];
  }

  for (const key of Object.keys(resume)) {
    if (!ROOT_KEYS.has(key)) {
      issues.push(`$.${key}: not a JSON Resume v1.0.0 root key`);
    }
  }

  if (resume.$schema !== SCHEMA_HREF) {
    issues.push(`$.$schema must be ${SCHEMA_HREF}`);
  }

  const basics = resume.basics;
  if (!basics || typeof basics !== 'object') {
    issues.push('$.basics is required');
  } else {
    if (!basics.name) issues.push('$.basics.name is required');
    if (!basics.label) issues.push('$.basics.label is required');
    checkUrl(basics.url, '$.basics.url', issues);
    if (basics.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basics.email)) {
      issues.push('$.basics.email is not an email');
    }
  }

  const education = resume.education;
  if (!Array.isArray(education) || education.length !== 1) {
    issues.push('$.education must list Eastern Washington University only');
  } else {
    const school = education[0];
    if (school.institution !== 'Eastern Washington University') {
      issues.push('$.education[0].institution must be Eastern Washington University');
    }
    if (school.area !== 'Computer Science') {
      issues.push('$.education[0].area must be Computer Science');
    }
    if (!String(school.startDate || '').startsWith('2022-')) {
      issues.push('$.education[0].startDate must be 2022');
    }
    if (!String(school.endDate || '').startsWith('2027-')) {
      issues.push('$.education[0].endDate must be 2027');
    }
    if (!String(school.studyType || '').includes('2027')) {
      issues.push('$.education[0].studyType must include 2027');
    }
    checkUrl(school.url, '$.education[0].url', issues);
    checkDate(school.startDate, '$.education[0].startDate', issues);
    checkDate(school.endDate, '$.education[0].endDate', issues);
  }

  for (const [i, job] of (resume.work ?? []).entries()) {
    if (!job?.name) issues.push(`$.work[${i}].name is required`);
    if (!job?.position) issues.push(`$.work[${i}].position is required`);
    checkDate(job?.startDate, `$.work[${i}].startDate`, issues);
    checkDate(job?.endDate, `$.work[${i}].endDate`, issues);
    checkUrl(job?.url, `$.work[${i}].url`, issues);
  }

  for (const [i, award] of (resume.awards ?? []).entries()) {
    if (!award?.title) issues.push(`$.awards[${i}].title is required`);
    checkDate(award?.date, `$.awards[${i}].date`, issues);
    checkUrl(award?.url, `$.awards[${i}].url`, issues);
  }

  for (const [i, pub] of (resume.publications ?? []).entries()) {
    if (!pub?.name) issues.push(`$.publications[${i}].name is required`);
    checkDate(pub?.releaseDate, `$.publications[${i}].releaseDate`, issues);
    checkUrl(pub?.url, `$.publications[${i}].url`, issues);
  }

  for (const [i, project] of (resume.projects ?? []).entries()) {
    if (!project?.name) issues.push(`$.projects[${i}].name is required`);
    checkDate(project?.startDate, `$.projects[${i}].startDate`, issues);
    checkDate(project?.endDate, `$.projects[${i}].endDate`, issues);
    checkUrl(project?.url, `$.projects[${i}].url`, issues);
  }

  walkStrings(resume, (text, trail) => {
    if (text.includes('\u2014') || text.includes('\u2013')) {
      issues.push(`${trail}: em or en dash (use a hyphen)`);
    }
    if (trail.startsWith('$.education') && /\bUniversity of Montana\b/i.test(text)) {
      issues.push(`${trail}: do not name University of Montana in Education`);
    }
    if (/(^|[^A-Za-z])CS([^A-Za-z]|$)/.test(text) && !/ChatGPT/.test(text)) {
      issues.push(`${trail}: write Computer Science, not CS`);
    }
  });

  if (!existsSync(pdfPath)) {
    issues.push('public/resume.pdf is missing (run npm run resume:pdf)');
  } else {
    const head = readFileSync(pdfPath).subarray(0, 5).toString('latin1');
    if (head !== '%PDF-') {
      issues.push('public/resume.pdf is not a PDF');
    }
  }

  return issues;
}

export function checkResume(filePath = RESUME_PATH, opts = {}) {
  const parsed = parseResumeFile(filePath);
  if (!parsed.ok) return parsed.issues;
  return validateResume(parsed.resume, opts);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const issues = checkResume();
  if (issues.length) {
    console.error('Resume check failed:');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }
  console.log('Resume check passed: resume.json parses, matches JSON Resume v1.0.0, house rules hold.');
}
