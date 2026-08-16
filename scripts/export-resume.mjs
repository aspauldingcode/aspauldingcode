#!/usr/bin/env node
/**
 * Build a clean Letter PDF from resume.json (no browser print chrome).
 *
 *   npm run resume:pdf
 *
 * Writes public/resume.pdf for static download from /resume.
 */
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const ROOT = path.resolve(process.cwd());
const RESUME_PATH = path.join(ROOT, 'resume.json');
const OUT_PATH = path.join(ROOT, 'public', 'resume.pdf');

function yearOf(iso) {
  if (!iso) return '';
  const y = String(iso).slice(0, 4);
  return /^\d{4}$/.test(y) ? y : '';
}

function yearRange(start, end) {
  const a = yearOf(start);
  if (!a) return '';
  if (!end) return `${a}-present`;
  return `${a}-${yearOf(end)}`;
}

function writePdf(resume) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 42, bottom: 42, left: 48, right: 48 },
      info: {
        Title: `${resume.basics?.name || 'Resume'} - Resume`,
        Author: resume.basics?.name || '',
        Subject: resume.basics?.label || 'Resume',
      },
    });

    const stream = fs.createWriteStream(OUT_PATH);
    doc.pipe(stream);

    const ink = '#1a1a18';
    const muted = '#5a5a55';
    const pageRight = doc.page.width - doc.page.margins.right;
    const contentWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const ensureSpace = (need = 48) => {
      if (doc.y + need > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
    };

    const section = (title) => {
      ensureSpace(36);
      doc.moveDown(0.55);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(ink)
        .text(title.toUpperCase(), { characterSpacing: 0.6 });
      const y = doc.y + 2;
      doc
        .moveTo(doc.page.margins.left, y)
        .lineTo(pageRight, y)
        .strokeColor('#c8c8c2')
        .lineWidth(0.6)
        .stroke();
      doc.moveDown(0.45);
      doc.fillColor(ink);
    };

    const entryHead = (left, right) => {
      ensureSpace(28);
      const rightW = 88;
      const leftW = contentWidth - rightW - 8;
      const y0 = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(left, {
        width: leftW,
        continued: false,
      });
      const afterLeft = doc.y;
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(muted)
        .text(right, doc.page.margins.left + leftW + 8, y0, {
          width: rightW,
          align: 'right',
          lineBreak: false,
        });
      doc.y = Math.max(afterLeft, y0 + 12);
      doc.x = doc.page.margins.left;
      doc.fillColor(ink);
    };

    const bullets = (items) => {
      for (const item of items) {
        if (!item) continue;
        ensureSpace(20);
        const bulletX = doc.page.margins.left;
        const textX = bulletX + 12;
        const y = doc.y;
        doc.font('Helvetica').fontSize(9.5).fillColor(ink);
        doc.text('•', bulletX, y, { width: 10, lineBreak: false });
        doc.text(item, textX, y, {
          width: contentWidth - 12,
          align: 'left',
        });
        doc.moveDown(0.12);
      }
    };

    const { basics } = resume;
    const place = [basics.location?.city, basics.location?.region]
      .filter(Boolean)
      .join(', ');

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(ink)
      .text(basics.name || 'Resume');
    if (basics.label) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(muted)
        .text(basics.label);
    }

    const contactBits = [
      basics.email,
      basics.phone,
      basics.url?.replace(/^https?:\/\//, ''),
      place,
    ].filter(Boolean);
    if (contactBits.length) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(muted)
        .text(contactBits.join('  /  '));
    }

    const profiles = (basics.profiles || [])
      .filter((p) => p.url)
      .map((p) => `${p.network}: ${p.url.replace(/^https?:\/\//, '')}`);
    if (profiles.length) {
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(muted)
        .text(profiles.join('  /  '), { width: contentWidth });
    }

    if (basics.summary) {
      section('Summary');
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(ink)
        .text(basics.summary, { width: contentWidth, align: 'left' });
    }

    if (resume.education?.length) {
      section('Education');
      for (const ed of resume.education) {
        const left = [ed.studyType, ed.area, ed.institution]
          .filter(Boolean)
          .join(', ');
        entryHead(left, yearRange(ed.startDate, ed.endDate));
        doc.moveDown(0.15);
      }
    }

    if (resume.work?.length) {
      section('Experience');
      for (const job of resume.work) {
        const title = [job.position, job.name].filter(Boolean).join(', ');
        entryHead(title, yearRange(job.startDate, job.endDate));
        const meta = [job.location].filter(Boolean).join(' / ');
        if (meta) {
          doc.font('Helvetica').fontSize(9).fillColor(muted).text(meta);
          doc.fillColor(ink);
        }
        if (job.highlights?.length) bullets(job.highlights);
        doc.moveDown(0.25);
      }
    }

    if (resume.projects?.length) {
      section('Selected work');
      for (const project of resume.projects) {
        const when = yearRange(project.startDate, project.endDate);
        entryHead(project.name, when);
        const line = [project.description, project.url?.replace(/^https?:\/\//, '')]
          .filter(Boolean)
          .join('  /  ');
        if (line) {
          doc.font('Helvetica').fontSize(9.5).fillColor(ink).text(line, {
            width: contentWidth,
          });
        }
        if (project.highlights?.length) bullets(project.highlights);
        doc.moveDown(0.2);
      }
    }

    if (resume.skills?.length) {
      section('Skills');
      for (const group of resume.skills) {
        const words = (group.keywords || []).join(', ');
        if (!words) continue;
        ensureSpace(18);
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(ink)
          .text(`${group.name}: `, { continued: true });
        doc.font('Helvetica').text(words);
      }
    }

    if (resume.awards?.length) {
      section('Awards');
      const lines = [...resume.awards]
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .map((award) => {
          const bits = [award.title, award.awarder].filter(Boolean).join(' / ');
          const y = yearOf(award.date);
          return y ? `${bits} (${y})` : bits;
        });
      bullets(lines);
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

const resume = JSON.parse(fs.readFileSync(RESUME_PATH, 'utf8'));
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
await writePdf(resume);
const size = fs.statSync(OUT_PATH).size;
console.log(`Wrote ${OUT_PATH} (${size} bytes)`);
