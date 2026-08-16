import { NextResponse } from 'next/server';
import { validateContactSubmission } from '@/lib/contactMessagePolicy';

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

  const cleaned = await validateContactSubmission({
    name: String(body.name || ''),
    email: String(body.email || ''),
    message: String(body.message || ''),
  });
  if (!cleaned.ok) {
    return NextResponse.json(cleaned, { status: 400 });
  }

  return NextResponse.json({ ok: true, email: cleaned.email });
}
