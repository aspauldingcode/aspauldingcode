import { NextResponse } from 'next/server';

const SECRET_KEY = process.env.RECAPTCHA_SECRETKEY;
const SCORE_THRESHOLD = 0.5;
const EXPECTED_ACTION = 'contact';

type GoogleVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
};

export async function POST(request: Request) {
  if (!SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: 'reCAPTCHA is not configured.' },
      { status: 500 }
    );
  }

  let token: unknown;
  let action: unknown;
  try {
    const body = await request.json();
    token = body?.token;
    action = body?.action;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }

  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ success: false, error: 'Missing reCAPTCHA token.' }, { status: 400 });
  }

  const expectedAction =
    typeof action === 'string' && action.trim() ? action.trim() : EXPECTED_ACTION;

  try {
    const params = new URLSearchParams();
    params.set('secret', SECRET_KEY);
    params.set('response', token);

    const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = (await recaptchaRes.json()) as GoogleVerifyResponse;
    const score = typeof data.score === 'number' ? data.score : 0;
    const ok =
      data.success === true &&
      score >= SCORE_THRESHOLD &&
      data.action === expectedAction;

    return NextResponse.json(
      {
        success: ok,
        score,
        action: data.action ?? null,
        ...(ok ? {} : { error: 'reCAPTCHA verification failed.' }),
      },
      { status: ok ? 200 : 403 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify reCAPTCHA',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}
