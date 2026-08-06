/**
 * Server-side contact message policy.
 *
 * Profanity lists live in the `obscenity` dependency (not in this repo’s source),
 * which is the usual approach for public codebases. Matching uses the English
 * dataset plus recommended transformers (leet speak, confusables, duplicates).
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
  isValidEmail,
} from '@/lib/contactLimits';

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export type MessagePolicyResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateContactMessage(message: string): MessagePolicyResult {
  const trimmed = message.trim();

  if (!trimmed) {
    return { ok: false, reason: 'Please write a message.' };
  }

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

  if (matcher.hasMatch(trimmed)) {
    return {
      ok: false,
      reason: 'Please keep the message professional and try again.',
    };
  }

  return { ok: true };
}

export function validateContactName(name: string): MessagePolicyResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, reason: 'Please enter your name.' };
  }
  if (trimmed.length > MAX_NAME_CHARS) {
    return { ok: false, reason: 'Name is too long.' };
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
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, reason: 'Please enter your email.' };
  }
  if (trimmed.length > MAX_EMAIL_CHARS) {
    return { ok: false, reason: 'Email is too long.' };
  }
  if (!isValidEmail(trimmed)) {
    return { ok: false, reason: 'Please enter a valid email address.' };
  }
  return { ok: true };
}
