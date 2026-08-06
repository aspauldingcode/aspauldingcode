import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import sparticuz from '@sparticuz/chromium';
import { render } from 'jsonresume-theme-flat';

const resumeJsonPath = path.resolve(process.cwd(), 'resume.json');
const htmlOutputPath = path.resolve(process.cwd(), 'public/resume.html');
const pdfOutputPath = path.resolve(process.cwd(), 'public/resume.pdf');

async function exportResume() {
  console.log('Reading resume.json...');
  const resumeJson = JSON.parse(fs.readFileSync(resumeJsonPath, 'utf8'));

  console.log('Rendering HTML with jsonresume-theme-flat...');
  const html = render(resumeJson);
  fs.writeFileSync(htmlOutputPath, html, 'utf8');
  console.log('Saved public/resume.html');

  console.log('Launching Puppeteer to generate PDF...');
  
  const isLocal = !process.env.VERCEL;
  
  let executablePath;
  if (isLocal) {
    // Check puppeteer cache
    const { homedir } = await import('os');
    const { globSync } = await import('glob');
    const cacheDir = path.join(homedir(), '.cache', 'puppeteer', 'chrome');
    const matches = globSync(cacheDir + '/**/Google Chrome for Testing', { absolute: true });
    if (matches.length > 0) {
      executablePath = matches[0];
    } else {
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
  } else {
    executablePath = await sparticuz.executablePath();
  }

  try {
    const browser = await puppeteer.launch({
      args: isLocal ? [] : sparticuz.args,
      defaultViewport: sparticuz.defaultViewport,
      executablePath: executablePath,
      headless: isLocal ? true : sparticuz.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfOutputPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm',
      }
    });

    await browser.close();
    console.log('Saved public/resume.pdf');
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    if (!isLocal) {
      process.exit(1);
    } else {
      console.warn('Skipping PDF generation locally due to local Puppeteer environment issues.');
    }
  }
}

exportResume();
