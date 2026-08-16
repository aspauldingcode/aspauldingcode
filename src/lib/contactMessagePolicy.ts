/**
 * Server-side contact policy: length, language, injection, and email reachability.
 * Profanity lists live in `obscenity` (not in this repo).
 */
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity';
import {
  MAX_EMAIL_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_MESSAGE_WORDS,
  MAX_NAME_CHARS,
  MIN_MESSAGE_WORDS,
  countWords,
} from '@/lib/contactLimits';
import { checkEmailReachable } from '@/lib/contactEmailReachable';
import {
  hasControlChars,
  isIncompleteMessage,
  isPlausibleName,
  looksLikeExecOrMarkup,
  sanitizePlainText,
} from '@/lib/contactSanitize';

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export type MessagePolicyResult =
  | { ok: true }
  | { ok: false; reason: string };

export type ContactFields = {
  name: string;
  email: string;
  message: string;
};

export type CleanContact =
  | {
      ok: true;
      name: string;
      email: string;
      message: string;
    }
  | { ok: false; reason: string };

function rejectHostile(value: string, field: string): MessagePolicyResult | null {
  if (hasControlChars(value)) {
    return { ok: false, reason: `Please remove special characters from the ${field}.` };
  }
  if (looksLikeExecOrMarkup(value)) {
    return {
      ok: false,
      reason: `Please send plain text in the ${field}. No links-as-code or markup.`,
    };
  }
  return null;
}

export function validateContactMessage(message: string): MessagePolicyResult {
  const trimmed = sanitizePlainText(message);

  if (!trimmed) {
    return { ok: false, reason: 'Please write a message.' };
  }

  const hostile = rejectHostile(trimmed, 'message');
  if (hostile) return hostile;

  if (trimmed.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      reason: `Message is too long (max ${MAX_MESSAGE_CHARS} characters).`,
    };
  }

  const words = countWords(trimmed);
  if (words < MIN_MESSAGE_WORDS) {
    return {
      ok: false,
      reason: `Message is too short (min ${MIN_MESSAGE_WORDS} words).`,
    };
  }
  if (words > MAX_MESSAGE_WORDS) {
    return {
      ok: false,
      reason: `Message is too long (max ${MAX_MESSAGE_WORDS} words).`,
    };
  }

  if (isIncompleteMessage(trimmed, words)) {
    return {
      ok: false,
      reason: 'Please write a complete message in plain language.',
    };
  }

  if (matcher.hasMatch(trimmed)) {
    return {
      ok: false,
      reason: 'Please keep the message professional and try again.',
    };
  }

  return { ok: true };
}

export function validateContactName(name: string): MessagePolicyResult {
  const trimmed = sanitizePlainText(name);
  if (!trimmed) {
    return { ok: false, reason: 'Please enter your name.' };
  }
  if (trimmed.length > MAX_NAME_CHARS) {
    return { ok: false, reason: 'Name is too long.' };
  }
  const hostile = rejectHostile(trimmed, 'name');
  if (hostile) return hostile;
  if (!isPlausibleName(trimmed)) {
    return { ok: false, reason: 'Please enter your real name.' };
  }
  if (matcher.hasMatch(trimmed)) {
    return {
      ok: false,
      reason: 'Please keep the name field professional and try again.',
    };
  }
  return { ok: true };
}

export function validateContactEmail(email: string): MessagePolicyResult {
  const trimmed = sanitizePlainText(email);
  if (!trimmed) {
    return { ok: false, reason: 'Please enter your email.' };
  }
  if (trimmed.length > MAX_EMAIL_CHARS) {
    return { ok: false, reason: 'Email is too long.' };
  }
  const hostile = rejectHostile(trimmed, 'email');
  if (hostile) return hostile;
  return { ok: true };
}

export async function validateContactSubmission(
  fields: ContactFields
): Promise<CleanContact> {
  const name = sanitizePlainText(fields.name);
  const emailRaw = sanitizePlainText(fields.email);
  const message = sanitizePlainText(fields.message);

  const nameResult = validateContactName(name);
  if (!nameResult.ok) return nameResult;

  const emailShape = validateContactEmail(emailRaw);
  if (!emailShape.ok) return emailShape;

  const reachable = await checkEmailReachable(emailRaw);
  if (!reachable.ok) return reachable;

  const messageResult = validateContactMessage(message);
  if (!messageResult.ok) return messageResult;

  return { ok: true, name, email: reachable.email, message };
}
