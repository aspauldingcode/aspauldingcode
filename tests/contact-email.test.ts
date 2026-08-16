import { describe, expect, it } from 'vitest';
import {
  checkEmailReachable,
  isWellFormedEmail,
  normalizeEmail,
} from '@/lib/contactEmailReachable';

describe('contactEmailReachable', () => {
  it('normalizes and checks format without claiming a mailbox exists', () => {
    expect(normalizeEmail('  Alex@Gmail.com  ')).toBe('alex@gmail.com');
    expect(isWellFormedEmail('alex@ewu.edu')).toBe(true);
    expect(isWellFormedEmail('not-an-email')).toBe(false);
    expect(isWellFormedEmail('alex@localhost')).toBe(false);
  });

  it('accepts a real mail domain and rejects fake or disposable ones', async () => {
    const gmail = await checkEmailReachable('aspauldingcode@gmail.com');
    expect(gmail).toMatchObject({ ok: true, domain: 'gmail.com' });

    const disposable = await checkEmailReachable('temp@yopmail.com');
    expect(disposable.ok).toBe(false);

    const dead = await checkEmailReachable('nobody@no-such-mx-host-aspauldingcode.test');
    expect(dead.ok).toBe(false);
  });
});
