#!/usr/bin/env node
/**
 * Draft resume.json (+ optional SEO) from activity.json via Groq/Gemini,
 * or write a non-AI activity notes file when no LLM key is present.
 *
 * Usage:
 *   node scripts/portfolio-agent/propose.mjs --activity artifacts/activity.json
 *   node scripts/portfolio-agent/propose.mjs --activity artifacts/activity.json --apply
 *   node scripts/portfolio-agent/propose.mjs --activity artifacts/activity.json --no-llm
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(process.cwd());

function argFlag(flag) {
  return process.argv.includes(flag);
}

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const ACTIVITY_PATH = path.resolve(
  ROOT,
  argValue('--activity', 'artifacts/activity.json')
);
const APPLY = argFlag('--apply');
const FORCE_NO_LLM = argFlag('--no-llm');
const DATE = new Date().toISOString().slice(0, 10);

const WORK_SLUGS = {
  Wawona: 'wawona',
  'apple-sharpener': 'apple-sharpener',
  Whisperer: 'whisperer',
  'ModernOrange Band': 'modernorange-band',
  ModernOrange: 'modernorange-band',
  'Sentinel High School Computer Building Club': 'sentinel-pc-building-club',
  'Sentinel PC Building Club': 'sentinel-pc-building-club',
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function hasForbiddenDash(text) {
  return /[\u2013\u2014]/.test(text); // en or em dash
}

function walkStrings(value, visit) {
  if (typeof value === 'string') visit(value);
  else if (Array.isArray(value)) value.forEach((v) => walkStrings(v, visit));
  else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) walkStrings(v, visit);
  }
}

function validateResume(resume) {
  const errors = [];
  if (!resume?.basics?.name) errors.push('basics.name required');
  if (!Array.isArray(resume.projects)) errors.push('projects array required');
  walkStrings(resume, (s) => {
    if (hasForbiddenDash(s)) errors.push(`forbidden dash in: ${s.slice(0, 80)}`);
  });
  return errors;
}

function loadWorkMeta() {
  const dir = path.join(ROOT, 'content', 'work');
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const slug = name.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, name), 'utf8');
    const fm = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) continue;
    const images = [...fm[1].matchAll(/^\s*-\s+(\/[\w./-]+)/gm)].map((m) => m[1]);
    out[slug] = { path: path.join(dir, name), raw, images };
  }
  return out;
}

function validateSeo(seo, workMeta) {
  const errors = [];
  if (!seo || typeof seo !== 'object') return errors;
  const work = seo.work || {};
  for (const [slug, patch] of Object.entries(work)) {
    const meta = workMeta[slug];
    if (!meta) {
      errors.push(`seo.work unknown slug: ${slug}`);
      continue;
    }
    if (patch.imageAlts) {
      if (!Array.isArray(patch.imageAlts)) {
        errors.push(`${slug}.imageAlts must be array`);
      } else if (meta.images.length && patch.imageAlts.length !== meta.images.length) {
        errors.push(
          `${slug}.imageAlts length ${patch.imageAlts.length} != images ${meta.images.length}`
        );
      } else {
        for (const alt of patch.imageAlts) {
          if (!String(alt || '').trim()) errors.push(`${slug} empty imageAlt`);
          if (hasForbiddenDash(String(alt))) errors.push(`${slug} imageAlt has dash`);
        }
      }
    }
    if (patch.blurb != null) {
      if (hasForbiddenDash(String(patch.blurb))) errors.push(`${slug} blurb has dash`);
    }
  }
  return errors;
}

function applyWorkSeo(seo, workMeta) {
  const work = seo?.work || {};
  const changed = [];
  for (const [slug, patch] of Object.entries(work)) {
    const meta = workMeta[slug];
    if (!meta) continue;
    let raw = meta.raw;
    if (patch.blurb) {
      const blurb = String(patch.blurb).trim();
      if (/^blurb:\s*>-/m.test(raw)) {
        raw = raw.replace(
          /blurb:\s*>-\n(?: {2}.*\n)*/,
          `blurb: >-\n  ${blurb.replace(/\n/g, '\n  ')}\n`
        );
      } else if (/^blurb:\s*.+$/m.test(raw)) {
        raw = raw.replace(/^blurb:\s*.+$/m, `blurb: ${JSON.stringify(blurb)}`);
      }
    }
    if (Array.isArray(patch.imageAlts) && patch.imageAlts.length) {
      const block = ['imageAlts:', ...patch.imageAlts.map((a) => `  - ${JSON.stringify(a)}`)].join(
        '\n'
      );
      if (/^imageAlts:\n(?: {2}- .+\n)*/m.test(raw)) {
        raw = raw.replace(/^imageAlts:\n(?: {2}- .+\n)*/m, `${block}\n`);
      } else {
        raw = raw.replace(/\nlinks:/, `\n${block}\nlinks:`);
        if (!raw.includes('imageAlts:')) {
          raw = raw.replace(/\n---\n/, `\n${block}\n---\n`);
        }
      }
    }
    if (raw !== meta.raw) {
      meta.raw = raw;
      changed.push(meta.path);
      if (APPLY) fs.writeFileSync(meta.path, raw);
    }
  }
  return changed;
}

async function callGroq(system, user) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(system, user) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
}

function buildUserPrompt(activity, resume, workMeta) {
  const imageCounts = Object.fromEntries(
    Object.entries(workMeta).map(([slug, m]) => [slug, m.images.length])
  );
  return `Current resume.json:
${JSON.stringify(resume, null, 2)}

Recent GitHub activity:
${JSON.stringify(activity, null, 2)}

Work gallery image counts by slug (imageAlts length must match when provided):
${JSON.stringify(imageCounts, null, 2)}

Resume project name → work slug map:
${JSON.stringify(WORK_SLUGS, null, 2)}

Return JSON with this shape:
{
  "summary": "short PR summary",
  "resume": { ...full resume.json object... },
  "seo": {
    "work": {
      "<slug>": { "blurb": "optional", "imageAlts": ["..."] }
    }
  },
  "readme_exploring": ["optional bullet", "..."],
  "linkedin_draft": "optional markdown draft"
}

Only include seo.work entries you are confident about. Prefer updating resume project descriptions and skills from real commits. Do not invent metrics.`;
}

function writeActivityDraft(activity) {
  const dir = path.join(ROOT, 'drafts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `activity-${DATE}.md`);
  const lines = [
    `# Activity notes (${DATE})`,
    '',
    `Since: ${activity.since}`,
    '',
  ];
  for (const repo of activity.repos || []) {
    lines.push(`## ${repo.full_name}`);
    if (repo.languages_hint?.length) {
      lines.push(`Languages: ${repo.languages_hint.join(', ')}`);
    }
    lines.push('');
    for (const c of repo.commits || []) {
      lines.push(`- \`${c.sha}\` ${c.message} (${c.date || 'unknown date'})`);
    }
    if (!(repo.commits || []).length) lines.push('- (no commits in window)');
    lines.push('');
  }
  lines.push('Edit resume.json manually from these bullets, then open/merge a PR.');
  lines.push('');
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  return file;
}

function maybeExportResume() {
  const script = path.join(ROOT, 'scripts', 'export-resume.mjs');
  if (!fs.existsSync(script)) {
    console.log('export-resume.mjs not present; skipping PDF gate');
    return;
  }
  execFileSync(process.execPath, [script], { stdio: 'inherit', cwd: ROOT });
}

async function main() {
  if (!fs.existsSync(ACTIVITY_PATH)) {
    console.error(`Missing activity file: ${ACTIVITY_PATH}`);
    process.exit(1);
  }
  const activity = readJson(ACTIVITY_PATH);
  const resumePath = path.join(ROOT, 'resume.json');
  const resume = readJson(resumePath);
  const workMeta = loadWorkMeta();
  const promptPath = path.join(ROOT, 'scripts', 'portfolio-agent', 'PROMPT.md');
  const system = fs.readFileSync(promptPath, 'utf8');

  const provider = (process.env.LLM_PROVIDER || 'groq').toLowerCase();
  const hasKey =
    !FORCE_NO_LLM &&
    ((provider === 'gemini' && process.env.GEMINI_API_KEY) ||
      (provider !== 'gemini' && process.env.GROQ_API_KEY));

  const outDir = APPLY ? ROOT : path.join(ROOT, 'artifacts', 'proposal');
  fs.mkdirSync(path.join(ROOT, 'artifacts', 'proposal'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'drafts'), { recursive: true });

  if (!hasKey) {
    const notes = writeActivityDraft(activity);
    const summary = {
      mode: 'no-llm',
      notes,
      summary: `Activity notes for ${DATE}; no LLM key or --no-llm set`,
    };
    fs.writeFileSync(
      path.join(ROOT, 'artifacts', 'proposal', 'result.json'),
      `${JSON.stringify(summary, null, 2)}\n`
    );
    console.log(`No LLM: wrote ${notes}`);
    return;
  }

  const user = buildUserPrompt(activity, resume, workMeta);
  const rawText =
    provider === 'gemini' ? await callGemini(system, user) : await callGroq(system, user);

  let proposal;
  try {
    proposal = JSON.parse(rawText);
  } catch {
    console.error('LLM did not return valid JSON');
    console.error(rawText.slice(0, 500));
    process.exit(1);
  }

  if (!proposal.resume) {
    console.error('Proposal missing resume');
    process.exit(1);
  }

  const resumeErrors = validateResume(proposal.resume);
  const seoErrors = validateSeo(proposal.seo, workMeta);
  if (resumeErrors.length || seoErrors.length) {
    console.error('Validation failed:', [...resumeErrors, ...seoErrors]);
    process.exit(1);
  }

  const resumeOut = APPLY
    ? resumePath
    : path.join(outDir, 'resume.json');
  fs.writeFileSync(resumeOut, `${JSON.stringify(proposal.resume, null, 2)}\n`);

  const seoChanged = applyWorkSeo(proposal.seo, workMeta);
  if (!APPLY && proposal.seo) {
    fs.writeFileSync(
      path.join(ROOT, 'artifacts', 'proposal', 'seo.json'),
      `${JSON.stringify(proposal.seo, null, 2)}\n`
    );
  }

  if (proposal.linkedin_draft) {
    const linkedinPath = path.join(ROOT, 'drafts', `linkedin-${DATE}.md`);
    fs.writeFileSync(linkedinPath, `${String(proposal.linkedin_draft).trim()}\n`);
  }

  if (Array.isArray(proposal.readme_exploring) && proposal.readme_exploring.length) {
    fs.writeFileSync(
      path.join(ROOT, 'drafts', `readme-exploring-${DATE}.md`),
      `${proposal.readme_exploring.map((b) => `- ${b}`).join('\n')}\n`
    );
  }

  fs.writeFileSync(
    path.join(ROOT, 'artifacts', 'proposal', 'result.json'),
    `${JSON.stringify(
      {
        mode: provider,
        summary: proposal.summary || '',
        resume_out: resumeOut,
        seo_files: seoChanged,
        apply: APPLY,
      },
      null,
      2
    )}\n`
  );

  if (APPLY) {
    try {
      maybeExportResume();
    } catch (err) {
      console.error('export-resume failed; refusing to keep applied resume');
      throw err;
    }
  }

  console.log(`Proposal ready (${provider}). summary: ${proposal.summary || '(none)'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
