/** CalVer resume PDF: Alex-Spaulding-vYYYY.MM.DD.pdf */
import fs from 'node:fs';
import path from 'node:path';

export const RESUME_PDF_STEM = 'Alex-Spaulding';
export const RESUME_CALVER_RE = /^v(\d{4})\.(\d{2})\.(\d{2})$/;
export const RESUME_PDF_NAME_RE = /^(?:Alex-Spaulding-)?v\d{4}\.\d{2}\.\d{2}\.pdf$/;

export function resumeCalVer(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `v${y}.${m}.${d}`;
}

export function resumePdfFilename(version) {
  return `${RESUME_PDF_STEM}-${version}.pdf`;
}

export function resumePdfHref(version) {
  return `/${resumePdfFilename(version)}`;
}

export function resumePdfRecord(date = new Date()) {
  const version = resumeCalVer(date);
  return {
    version,
    filename: resumePdfFilename(version),
    href: resumePdfHref(version),
  };
}

export function resumePdfMetaPath(root) {
  return path.join(root, 'src', 'lib', 'resumePdf.json');
}

export function readResumePdfMeta(root) {
  return JSON.parse(fs.readFileSync(resumePdfMetaPath(root), 'utf8'));
}

export function writeResumePdfMeta(root, record) {
  fs.writeFileSync(resumePdfMetaPath(root), `${JSON.stringify(record, null, 2)}\n`);
}

export function publicResumePdfPath(root, record = readResumePdfMeta(root)) {
  return path.join(root, 'public', record.filename);
}

export function removeStaleResumePdfs(root, keepName) {
  const dir = path.join(root, 'public');
  for (const name of fs.readdirSync(dir)) {
    if (name === keepName) continue;
    if (name === 'resume.pdf' || RESUME_PDF_NAME_RE.test(name)) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
}
