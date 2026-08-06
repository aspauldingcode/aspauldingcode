import { NextResponse } from 'next/server';

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function GET() {
  // Serve cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60_000) {
    return NextResponse.json({ token: cachedToken });
  }

  const clientId     = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'TIDAL credentials not configured' }, { status: 500 });
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://auth.tidal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `TIDAL auth failed: ${text}` }, { status: res.status });
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  return NextResponse.json({ token: cachedToken });
}
