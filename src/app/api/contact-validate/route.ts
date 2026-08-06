import { NextResponse } from 'next/server';
import {
  validateContactEmail,
  validateContactMessage,
  validateContactName,
} from '@/lib/contactMessagePolicy';

export const runtime = 'nodejs';

type Body = {
  name?: string;
  email?: string;
  message?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid request.' }, { status: 400 });
  }

  const nameResult = validateContactName(String(body.name || ''));
  if (!nameResult.ok) {
    return NextResponse.json(nameResult, { status: 400 });
  }

  const emailResult = validateContactEmail(String(body.email || ''));
  if (!emailResult.ok) {
    return NextResponse.json(emailResult, { status: 400 });
  }

  const messageResult = validateContactMessage(String(body.message || ''));
  if (!messageResult.ok) {
    return NextResponse.json(messageResult, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
