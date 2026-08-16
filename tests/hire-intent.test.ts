import { describe, expect, it } from 'vitest';
import { HIRE_PARAM, searchHasHireIntent } from '@/lib/hireIntent';
import { contactTemplateParams } from '@/lib/emailjsServer';

describe('hire intent', () => {
  it('treats hire=1 as a hiring visit', () => {
    expect(HIRE_PARAM).toBe('hire');
    expect(searchHasHireIntent('hire=1')).toBe(true);
    expect(searchHasHireIntent('?hire=1')).toBe(true);
    expect(searchHasHireIntent('hire=0')).toBe(false);
    expect(searchHasHireIntent('')).toBe(false);
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
