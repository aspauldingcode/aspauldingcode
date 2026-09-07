import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HIRE_HREF, HIRE_PARAM, searchHasHireIntent } from '@/lib/hireIntent';
import { contactTemplateParams } from '@/lib/emailjsServer';

const root = path.resolve(__dirname, '..');

describe('hire intent', () => {
  it('treats hire=1 as a hiring visit', () => {
    expect(HIRE_PARAM).toBe('hire');
    expect(HIRE_HREF).toBe('/?hire=1#contact');
    expect(searchHasHireIntent('hire=1')).toBe(true);
    expect(searchHasHireIntent('?hire=1')).toBe(true);
    expect(searchHasHireIntent('hire=0')).toBe(false);
    expect(searchHasHireIntent('')).toBe(false);
  });

  it('always marks hire on /, then scrolls the window on the home shell', () => {
    const intent = readFileSync(path.join(root, 'src/lib/hireIntent.ts'), 'utf8');
    expect(intent).toContain("pushState(null, '', HIRE_HREF)");
    expect(intent).toContain('applyHireCheckbox');
    expect(intent).toContain('contact-hiring');
    const email = readFileSync(path.join(root, 'src/config/email.ts'), 'utf8');
    expect(email).toContain('import.meta.env.PUBLIC_RECAPTCHA_SITEKEY');
    expect(email).not.toContain('process.env');
    const runtime = readFileSync(path.join(root, 'src/lib/hireMeRuntime.ts'), 'utf8');
    expect(runtime).toContain('CLOSE_WORK_EVENT');
    expect(runtime).toContain("querySelector('.split-shell[data-home-shell]')");
    const scroll = readFileSync(path.join(root, 'src/lib/scrollHomeSection.ts'), 'utf8');
    expect(scroll).toContain("querySelector('.split-shell[data-home-shell]')");
    expect(scroll).toContain('window.scrollTo');
    const hireMe = readFileSync(path.join(root, 'src/scripts/hire-me.ts'), 'utf8');
    expect(hireMe).toContain('a.hire-me');
    const home = readFileSync(path.join(root, 'src/components/HomePage.astro'), 'utf8');
    expect(home).toContain('client:idle');
    expect(home).toContain('initialHiring');
  });

  it('sends hire_me and reply_to as EmailJS template fields', () => {
    const hired = contactTemplateParams({
      name: 'Jordan Lee',
      email: 'jordan.lee@gmail.com',
      message: 'Hello from a hiring manager about a systems role.',
      hiring: true,
    });
    expect(hired.hire_me).toBe('true');
    expect(hired.reply_to).toBe('jordan.lee@gmail.com');
    expect(hired.from_email).toBe('jordan.lee@gmail.com');
    expect(hired.from_name).toBe('Jordan Lee');
    expect(hired.message).toContain('Wants to hire Alex: true');
    expect(hired.message).toContain('Reply to: jordan.lee@gmail.com');

    const casual = contactTemplateParams({
      name: 'Jordan Lee',
      email: 'jordan.lee@gmail.com',
      message: 'Just saying hello about Wawona.',
      hiring: false,
    });
    expect(casual.hire_me).toBe('false');
    expect(casual.message).toContain('Wants to hire Alex: false');
  });
});
