import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

describe('reCAPTCHA badge', () => {
  it('hides the Google badge and keeps branding on the contact form', () => {
    const css = readFileSync(path.join(root, 'src/styles/globals.css'), 'utf8');
    const form = readFileSync(
      path.join(root, 'src/components/ContactForm.tsx'),
      'utf8'
    );

    expect(css).toMatch(/\.grecaptcha-badge\s*\{[^}]*visibility:\s*hidden/s);
    expect(form).toContain('This site is protected by reCAPTCHA.');
    expect(form).toContain('contact-recaptcha');
  });
});
