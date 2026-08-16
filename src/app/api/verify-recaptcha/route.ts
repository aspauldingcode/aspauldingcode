import { NextResponse } from 'next/server';
import { verifyRecaptchaToken } from '@/lib/recaptchaVerify';

const EXPECTED_ACTION = 'contact';

export async function POST(request: Request) {
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

  const result = await verifyRecaptchaToken(token, expectedAction);
  return NextResponse.json(
    { success: result.ok, ...(result.ok ? {} : { error: result.reason }) },
    { status: result.ok ? 200 : 403 }
  );
}
