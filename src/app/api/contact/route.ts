import { NextResponse } from 'next/server';
import { validateContactSubmission } from '@/lib/contactMessagePolicy';
import { sendContactMail } from '@/lib/emailjsServer';
import { verifyRecaptchaToken } from '@/lib/recaptchaVerify';

export const runtime = 'nodejs';

const RECAPTCHA_ACTION = 'contact';

type Body = {
  name?: string;
  email?: string;
  message?: string;
  hiring?: boolean;
  token?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid request.' }, { status: 400 });
  }

  const token = String(body.token || '').trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, reason: 'Could not verify you are human. Refresh and try again.' },
      { status: 400 }
    );
  }

  const captcha = await verifyRecaptchaToken(token, RECAPTCHA_ACTION);
  if (!captcha.ok) {
    return NextResponse.json(captcha, { status: 403 });
  }

  const cleaned = await validateContactSubmission({
    name: String(body.name || ''),
    email: String(body.email || ''),
    message: String(body.message || ''),
  });
  if (!cleaned.ok) {
    return NextResponse.json(cleaned, { status: 400 });
  }

  try {
    await sendContactMail({
      name: cleaned.name,
      email: cleaned.email,
      message: cleaned.message,
      hiring: body.hiring === true,
    });
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'Could not send. Try again later.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
