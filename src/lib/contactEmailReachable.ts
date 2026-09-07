import { promises as dns } from 'node:dns';
import { isValidEmail } from '@/lib/contactLimits';

/** Common throwaway hosts. Real providers (Gmail, iCloud, school, work) stay allowed. */
const DISPOSABLE = new Set(
  [
    '10minutemail.com',
    'guerrillamail.com',
    'guerrillamail.net',
    'mailinator.com',
    'maildrop.cc',
    'tempmail.com',
    'temp-mail.org',
    'tmpmail.org',
    'trashmail.com',
    'yopmail.com',
    'sharklasers.com',
    'getnada.com',
    'dispostable.com',
    'fakeinbox.com',
    'throwaway.email',
    'mailnesia.com',
    'moakt.com',
    'emailondeck.com',
  ].map((d) => d.toLowerCase())
);

export type EmailReachResult =
  | { ok: true; email: string; domain: string }
  | { ok: false; reason: string };

function domainOf(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isWellFormedEmail(email: string): boolean {
  return isValidEmail(email);
}

async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.some((row) => row.exchange && row.exchange !== '.')) return true;
  } catch {
    /* try A / AAAA as a last resort for hosts that skip MX */
  }
  try {
    const a = await dns.resolve4(domain);
    if (a.length > 0) return true;
  } catch {
    /* ignore */
  }
  try {
    const aaaa = await dns.resolve6(domain);
    if (aaaa.length > 0) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Format + real mail domain. Cannot prove a mailbox exists without sending mail.
 * Checks MX (or A) so fake TLDs and dead hosts fail before EmailJS.
 */
export async function checkEmailReachable(raw: string): Promise<EmailReachResult> {
  const email = normalizeEmail(raw);
  if (!isWellFormedEmail(email)) {
    return { ok: false, reason: 'Please enter a valid email address.' };
  }

  const domain = domainOf(email);
  if (!domain) {
    return { ok: false, reason: 'Please enter a valid email address.' };
  }

  if (DISPOSABLE.has(domain) || domain.endsWith('.onion')) {
    return {
      ok: false,
      reason: 'Please use a lasting email address (work, school, or personal).',
    };
  }

  const reachable = await domainAcceptsMail(domain);
  if (!reachable) {
    return {
      ok: false,
      reason: 'That email domain does not accept mail. Check the address.',
    };
  }

  return { ok: true, email, domain };
}
