import { describe, expect, it } from 'vitest';
import {
  validateContactEmail,
  validateContactMessage,
  validateContactName,
  validateContactSubmission,
} from '@/lib/contactMessagePolicy';

const COMPLETE =
  'Hello Alex, I work on compositor tooling and would like to talk about an internship on platform or developer tools this year.';

describe('contactMessagePolicy', () => {
  it('accepts a complete professional message', () => {
    expect(validateContactMessage(COMPLETE)).toEqual({ ok: true });
  });

  it('rejects empty, short, and markup messages', () => {
    expect(validateContactMessage('').ok).toBe(false);
    expect(validateContactMessage('too short').ok).toBe(false);
    expect(validateContactMessage(`${COMPLETE} <script>x</script>`).ok).toBe(false);
  });

  it('rejects vulgar copy without storing the list in this repo', () => {
    const vulgar = `${COMPLETE} damn shit this is unprofessional filler text here.`;
    const result = validateContactMessage(vulgar);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/professional/i);
    }
  });

  it('accepts a real name and rejects junk names', () => {
    expect(validateContactName('Alex Spaulding')).toEqual({ ok: true });
    expect(validateContactName('').ok).toBe(false);
    expect(validateContactName('<b>Alex</b>').ok).toBe(false);
    expect(validateContactName('x').ok).toBe(false);
    expect(validateContactName('https://spam.example').ok).toBe(false);
  });

  it('requires a non-empty email field before reachability', () => {
    expect(validateContactEmail('').ok).toBe(false);
    expect(validateContactEmail('aspauldingcode@gmail.com')).toEqual({ ok: true });
  });

  it('accepts a reachable Gmail submission and rejects disposable hosts', async () => {
    const good = await validateContactSubmission({
      name: 'Jordan Lee',
      email: 'jordan.lee@gmail.com',
      message: COMPLETE,
    });
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.email).toBe('jordan.lee@gmail.com');
      expect(good.name).toBe('Jordan Lee');
    }

    const disposable = await validateContactSubmission({
      name: 'Jordan Lee',
      email: 'temp@yopmail.com',
      message: COMPLETE,
    });
    expect(disposable.ok).toBe(false);
    if (!disposable.ok) {
      expect(disposable.reason).toMatch(/lasting email/i);
    }
  });
});
