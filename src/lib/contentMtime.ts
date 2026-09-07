import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import resumePdf from '@/lib/resumePdf.json';

function fileMtimeMs(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function latestIn(dir: string, test: (name: string) => boolean): number {
  try {
    return readdirSync(dir).reduce((latest, name) => {
      if (!test(name)) return latest;
      return Math.max(latest, fileMtimeMs(join(dir, name)));
    }, 0);
  } catch {
    return 0;
  }
}

export function isoFromMtime(ms: number): string {
  const t = ms > 0 ? ms : Date.now();
  return new Date(t).toISOString();
}

/** Home page lastmod: resume, work markdown, and generated GitHub cards. */
export function homeLastmod(root: string): string {
  return isoFromMtime(
    Math.max(
      fileMtimeMs(join(root, 'resume.json')),
      latestIn(join(root, 'content/work'), (n) => n.endsWith('.md')),
      fileMtimeMs(join(root, 'public/github/contributions.json')),
      fileMtimeMs(join(root, 'public/github/stats.json'))
    )
  );
}

export function resumePdfLastmod(root: string): string {
  return isoFromMtime(fileMtimeMs(join(root, 'public', resumePdf.filename)));
}

export function workLastmod(root: string, slug: string): string {
  return isoFromMtime(fileMtimeMs(join(root, 'content/work', `${slug}.md`)));
}

export function whispererLegalLastmod(root: string): string {
  return isoFromMtime(
    Math.max(
      fileMtimeMs(join(root, 'src/components/WhispererPrivacy.tsx')),
      fileMtimeMs(join(root, 'src/components/WhispererTerms.tsx')),
      fileMtimeMs(join(root, 'src/components/LegalPage.tsx'))
    )
  );
}
