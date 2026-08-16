import { describe, expect, it } from 'vitest';
import {
  MAX_EMAIL_CHARS,
  MIN_MESSAGE_WORDS,
  clampMessageBoxHeight,
  countWords,
  isValidEmail,
  MESSAGE_BOX_MAX_PX,
  MESSAGE_BOX_MIN_PX,
} from '@/lib/contactLimits';

describe('contactLimits', () => {
  it('accepts ordinary emails and rejects thin or broken ones', () => {
    expect(isValidEmail('aspauldingcode@gmail.com')).toBe(true);
    expect(isValidEmail('alex@ewu.edu')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('alex@bad..edu')).toBe(false);
    expect(isValidEmail('a'.repeat(MAX_EMAIL_CHARS + 1) + '@ewu.edu')).toBe(false);
  });

  it('counts words and keeps the 15-word floor', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  one   two  ')).toBe(2);
    expect(MIN_MESSAGE_WORDS).toBe(15);
  });

  it('clamps the message box height', () => {
    expect(clampMessageBoxHeight(10)).toBe(MESSAGE_BOX_MIN_PX);
    expect(clampMessageBoxHeight(9999)).toBe(MESSAGE_BOX_MAX_PX);
    expect(clampMessageBoxHeight(200)).toBe(200);
  });
});
