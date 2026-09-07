import { validateContactSubmission } from '@/lib/contactMessagePolicy';
import { sendContactMail } from '@/lib/emailjsServer';
import { json } from '@/lib/http';
import { verifyRecaptchaToken } from '@/lib/recaptchaVerify';

const RECAPTCHA_ACTION = 'contact';

type Body = {
  name?: string;
  email?: string;
  message?: string;
  hiring?: boolean;
  token?: string;
};

export async function handleContactPost(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: 'Invalid request.' }, 400);
  }

  const token = String(body.token || '').trim();
  if (!token) {
    return json(
      { ok: false, reason: 'Could not verify you are human. Refresh and try again.' },
      400
    );
  }

  const captcha = await verifyRecaptchaToken(token, RECAPTCHA_ACTION);
  if (!captcha.ok) {
    return json(captcha, 403);
  }

  const cleaned = await validateContactSubmission({
    name: String(body.name || ''),
    email: String(body.email || ''),
    message: String(body.message || ''),
  });
  if (!cleaned.ok) {
    return json(cleaned, 400);
  }

  try {
    await sendContactMail({
      name: cleaned.name,
      email: cleaned.email,
      message: cleaned.message,
      hiring: body.hiring === true,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : '';
    if (detail.includes('misconfigured')) {
      return json({ ok: false, reason: 'Contact form is misconfigured.' }, 503);
    }
    console.error('contact send failed', detail);
    return json({ ok: false, reason: 'Could not send. Try again later.' }, 502);
  }

  return json({ ok: true });
}
