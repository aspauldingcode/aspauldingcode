import { describe, expect, it } from 'vitest';
import {
  hasControlChars,
  isIncompleteMessage,
  isPlausibleName,
  looksLikeExecOrMarkup,
  sanitizePlainText,
} from '@/lib/contactSanitize';
import { countWords } from '@/lib/contactLimits';

const COMPLETE =
  'Hello Alex, I work on compositor tooling and would like to talk about an internship on platform or developer tools this year.';

describe('contactSanitize', () => {
  it('strips carriage returns and trims', () => {
    expect(sanitizePlainText('  hello\r\nthere\r  ')).toBe('hello\nthere');
  });

  it('rejects control characters', () => {
    expect(hasControlChars('hello\u0000world')).toBe(true);
    expect(hasControlChars(COMPLETE)).toBe(false);
  });

  it('rejects markup, protocols, and exec-shaped text', () => {
    expect(looksLikeExecOrMarkup('<script>alert(1)</script>')).toBe(true);
    expect(looksLikeExecOrMarkup('<div>hi</div>')).toBe(true);
    expect(looksLikeExecOrMarkup('eval(payload)')).toBe(true);
    expect(looksLikeExecOrMarkup('javascript:alert(1)')).toBe(true);
    expect(looksLikeExecOrMarkup('Hello ${process.env}')).toBe(true);
    expect(looksLikeExecOrMarkup('onclick=alert(1)')).toBe(true);
    expect(looksLikeExecOrMarkup(COMPLETE)).toBe(false);
  });

  it('accepts ordinary names and rejects smash or URL names', () => {
    expect(isPlausibleName('Alex Spaulding')).toBe(true);
    expect(isPlausibleName("O'Neill")).toBe(true);
    expect(isPlausibleName('A')).toBe(false);
    expect(isPlausibleName('12345')).toBe(false);
    expect(isPlausibleName('https://spam.example')).toBe(false);
  });

  it('flags incomplete or smash-keyboard messages', () => {
    const smash = 'asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf';
    expect(isIncompleteMessage(smash, countWords(smash))).toBe(true);
    expect(isIncompleteMessage('!!!!!! !!!!!! !!!!!!', 2)).toBe(true);
    expect(isIncompleteMessage('aaaaaaaaaaaaaaaa hello there friend', 3)).toBe(true);
    expect(isIncompleteMessage(COMPLETE, countWords(COMPLETE))).toBe(false);
  });
});
