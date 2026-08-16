const SCORE_THRESHOLD = 0.5;

type GoogleVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
};

export async function verifyRecaptchaToken(
  token: string,
  expectedAction: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = process.env.RECAPTCHA_SECRETKEY;
  if (!secret) {
    return { ok: false, reason: 'Contact form is misconfigured.' };
  }

  const params = new URLSearchParams();
  params.set('secret', secret);
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

  if (!ok) {
    return { ok: false, reason: 'Could not verify you are human. Refresh and try again.' };
  }
  return { ok: true };
}
