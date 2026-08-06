'use client';

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import emailjs from '@emailjs/browser';
import { emailConfig } from '@/config/email';
import {
  MAX_MESSAGE_CHARS,
  MAX_MESSAGE_WORDS,
  MAX_NAME_CHARS,
  MESSAGE_BOX_MAX_PX,
  MESSAGE_BOX_MIN_PX,
  MIN_MESSAGE_WORDS,
  clampMessageBoxHeight,
  countWords,
  isValidEmail,
} from '@/lib/contactLimits';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

type Status = 'idle' | 'sending' | 'sent' | 'error';
type ResizeEdge = 'min' | 'max' | 'mid';

const RECAPTCHA_ACTION = 'contact';
const RECAPTCHA_WAIT_MS = 12_000;

function waitForGrecaptcha(timeoutMs: number): Promise<NonNullable<Window['grecaptcha']>> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.grecaptcha && typeof window.grecaptcha.execute === 'function') {
        resolve(window.grecaptcha);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error('reCAPTCHA failed to load. Refresh and try again.'));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

async function getRecaptchaToken(): Promise<string> {
  const siteKey = emailConfig.recaptchaSiteKey;
  if (!siteKey) {
    throw new Error('Contact form is misconfigured (missing reCAPTCHA).');
  }

  const grecaptcha = await waitForGrecaptcha(RECAPTCHA_WAIT_MS);
  return new Promise((resolve, reject) => {
    grecaptcha.ready(() => {
      grecaptcha
        .execute(siteKey, { action: RECAPTCHA_ACTION })
        .then((token) => {
          if (!token) reject(new Error('reCAPTCHA returned an empty token.'));
          else resolve(token);
        })
        .catch(() => reject(new Error('reCAPTCHA could not run. Refresh and try again.')));
    });
  });
}

function edgeForHeight(height: number): ResizeEdge {
  if (height <= MESSAGE_BOX_MIN_PX) return 'min';
  if (height >= MESSAGE_BOX_MAX_PX) return 'max';
  return 'mid';
}

function cursorForEdge(edge: ResizeEdge): string {
  if (edge === 'min') return 'se-resize';
  if (edge === 'max') return 'nw-resize';
  return 'nwse-resize';
}

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [boxHeight, setBoxHeight] = useState(MESSAGE_BOX_MIN_PX);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gripRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
  } | null>(null);

  const wordCount = useMemo(() => countWords(message), [message]);
  const underWordLimit = wordCount < MIN_MESSAGE_WORDS;
  const overWordLimit = wordCount > MAX_MESSAGE_WORDS;
  const nearWordLimit = wordCount >= MAX_MESSAGE_WORDS - 25;
  const resizeEdge = edgeForHeight(boxHeight);
  const canSubmit =
    status !== 'sending' && !underWordLimit && !overWordLimit && wordCount > 0;

  useEffect(() => {
    function stopDrag(pointerId: number) {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== pointerId) return;
      const grip = gripRef.current;
      if (grip?.hasPointerCapture(pointerId)) {
        grip.releasePointerCapture(pointerId);
      }
      dragRef.current = null;
      document.documentElement.classList.remove('contact-resizing');
      document.body.style.removeProperty('cursor');
    }

    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const ta = textareaRef.current;
      if (!drag || !ta || e.pointerId !== drag.pointerId) return;

      const next = clampMessageBoxHeight(
        drag.startHeight + (e.clientY - drag.startY)
      );
      if (next !== ta.offsetHeight) {
        ta.style.height = `${next}px`;
        setBoxHeight(next);
      }
      document.body.style.cursor = cursorForEdge(edgeForHeight(next));
    }

    function onUp(e: PointerEvent) {
      stopDrag(e.pointerId);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.documentElement.classList.remove('contact-resizing');
      document.body.style.removeProperty('cursor');
    };
  }, []);

  function beginResize(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const grip = e.currentTarget;
    const ta = textareaRef.current;
    if (!ta) return;
    grip.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startHeight: ta.offsetHeight,
    };
    document.documentElement.classList.add('contact-resizing');
    document.body.style.cursor = cursorForEdge(resizeEdge);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const nextMessage = String(data.get('message') || '').trim();

    if (!name || !email || !nextMessage) {
      setStatus('error');
      setError('Please fill in all fields.');
      return;
    }

    if (!isValidEmail(email)) {
      setStatus('error');
      setError('Please enter a valid email address.');
      return;
    }

    const words = countWords(nextMessage);
    if (words < MIN_MESSAGE_WORDS) {
      setStatus('error');
      setError(`Message is too short (min ${MIN_MESSAGE_WORDS} words).`);
      return;
    }

    if (words > MAX_MESSAGE_WORDS) {
      setStatus('error');
      setError(`Message is too long (max ${MAX_MESSAGE_WORDS} words).`);
      return;
    }

    if (nextMessage.length > MAX_MESSAGE_CHARS) {
      setStatus('error');
      setError(`Message is too long (max ${MAX_MESSAGE_CHARS} characters).`);
      return;
    }

    try {
      const policy = await fetch('/api/contact-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: nextMessage }),
      });
      const policyJson = (await policy.json()) as { ok?: boolean; reason?: string };
      if (!policy.ok || !policyJson.ok) {
        setStatus('error');
        setError(policyJson.reason || 'Please revise your message and try again.');
        return;
      }

      const token = await getRecaptchaToken();
      const verify = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: RECAPTCHA_ACTION }),
      });
      const result = (await verify.json()) as { success?: boolean };
      if (!verify.ok || !result.success) {
        throw new Error('reCAPTCHA failed');
      }

      await emailjs.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        { from_name: name, reply_to: email, message: nextMessage },
        emailConfig.publicKey
      );
      form.reset();
      setMessage('');
      setBoxHeight(MESSAGE_BOX_MIN_PX);
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof Error && err.message.startsWith('reCAPTCHA')
          ? err.message
          : err instanceof Error && err.message.includes('misconfigured')
            ? err.message
            : 'Could not send. Try again later.'
      );
    }
  }

  const canShrink = resizeEdge !== 'min';
  const canGrow = resizeEdge !== 'max';
  const metaClass = overWordLimit
    ? ' is-over'
    : underWordLimit && wordCount > 0
      ? ' is-under'
      : nearWordLimit
        ? ' is-near'
        : '';

  return (
    <form className="contact" onSubmit={onSubmit} noValidate>
      {/*
        Use field wrappers + htmlFor — a <div> inside <label> is invalid HTML.
        Browsers (Safari especially) rewrite that DOM and React hydration mismatches.
      */}
      <div className="contact-field">
        <label htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={MAX_NAME_CHARS}
          disabled={status === 'sending'}
        />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          maxLength={254}
          disabled={status === 'sending'}
        />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-message">Message</label>
        <div className="contact-message" data-resize={resizeEdge}>
          <textarea
            id="contact-message"
            ref={textareaRef}
            name="message"
            required
            maxLength={MAX_MESSAGE_CHARS}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={status === 'sending'}
            style={{ height: boxHeight }}
            aria-describedby="contact-message-meta"
          />
          <button
            ref={gripRef}
            type="button"
            className="contact-resize"
            aria-label={
              !canGrow
                ? 'Message box at maximum height. Drag up to shrink.'
                : !canShrink
                  ? 'Message box at minimum height. Drag down to expand.'
                  : 'Drag to resize message box'
            }
            disabled={status === 'sending'}
            onPointerDown={beginResize}
          />
        </div>
        <span
          id="contact-message-meta"
          className={`contact-meta${metaClass}`}
          aria-live="polite"
        >
          {wordCount < MIN_MESSAGE_WORDS
            ? `${wordCount} / ${MIN_MESSAGE_WORDS} min words`
            : `${wordCount} / ${MAX_MESSAGE_WORDS} words`}
        </span>
      </div>
      <button type="submit" className="ctrl-link" disabled={!canSubmit}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      {status === 'sent' && (
        <p className="ok" role="status">
          Sent. Thanks.
        </p>
      )}
      {status === 'error' && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
