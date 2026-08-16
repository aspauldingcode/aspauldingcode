/**
 * Reject incomplete, injectable, or non-text contact payloads.
 * Fail closed. Do not try to "clean" hostile input and send it anyway.
 */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HTML_OR_SCRIPT =
  /<\s*\/?\s*(script|iframe|object|embed|link|meta|style|svg|math)\b/i;
const HTML_TAG = /<\s*[a-zA-Z][^>]*>/;
const EXEC_HINT =
  /\beval\s*\(|\bFunction\s*\(|\brequire\s*\(|child_process|execSync|powershell|cmd\.exe|\/bin\/sh|\/bin\/bash/i;
const PROTOCOL_HINT = /\b(javascript|data|vbscript|file):/i;
const TEMPLATE_HINT = /(\{\{|\}\}|\$\{|<%|%>)/;
const EVENT_HANDLER = /\bon[a-z]{3,}\s*=/i;

export function hasControlChars(value: string): boolean {
  return CONTROL.test(value);
}

export function looksLikeExecOrMarkup(value: string): boolean {
  return (
    HTML_OR_SCRIPT.test(value) ||
    HTML_TAG.test(value) ||
    EXEC_HINT.test(value) ||
    PROTOCOL_HINT.test(value) ||
    TEMPLATE_HINT.test(value) ||
    EVENT_HANDLER.test(value)
  );
}

/** Name: letters and ordinary punctuation only. No URLs, no markup. */
export function isPlausibleName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (/\d/.test(trimmed) && trimmed.replace(/\D/g, '').length >= trimmed.length / 2) {
    return false;
  }
  if (/https?:\/\/|www\./i.test(trimmed)) return false;
  return /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*[\p{L}\p{M}.]$/u.test(trimmed);
}

/**
 * Incomplete / smash-keyboard copy: too little real language to be worth a reply.
 */
export function isIncompleteMessage(message: string, wordCount: number): boolean {
  const letters = message.replace(/[^\p{L}]/gu, '');
  const letterRatio = letters.length / Math.max(message.replace(/\s/g, '').length, 1);
  if (letterRatio < 0.55) return true;

  const unique = new Set(
    message
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}']/gu, ''))
      .filter((w) => w.length > 1)
  );
  if (wordCount >= 15 && unique.size < 8) return true;

  if (/(.)\1{7,}/.test(message)) return true;
  if (/(\b\w+\b)(?:\s+\1){3,}/i.test(message)) return true;

  const words = message.trim().split(/\s+/);
  const longTokens = words.filter((w) => w.length > 40 && !w.includes('@'));
  if (longTokens.length > 0) return true;

  return false;
}

export function sanitizePlainText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}
