import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyRecaptchaToken = vi.fn();
const sendContactMail = vi.fn();

vi.mock('@/lib/recaptchaVerify', () => ({
  verifyRecaptchaToken,
}));

vi.mock('@/lib/emailjsServer', () => ({
  sendContactMail,
}));

const COMPLETE =
  'Hello Alex, I work on compositor tooling and would like to talk about an internship on platform or developer tools this year.';

async function post(body: unknown) {
  const { POST } = await import('@/app/api/contact/route');
  return POST(
    new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    verifyRecaptchaToken.mockReset();
    sendContactMail.mockReset();
    verifyRecaptchaToken.mockResolvedValue({ ok: true });
    sendContactMail.mockResolvedValue(undefined);
  });

  it('rejects missing recaptcha and does not send mail', async () => {
    const res = await post({
      name: 'Jordan Lee',
      email: 'jordan.lee@gmail.com',
      message: COMPLETE,
    });
    expect(res.status).toBe(400);
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('rejects a failed recaptcha', async () => {
    verifyRecaptchaToken.mockResolvedValue({ ok: false, reason: 'Robot.' });
    const res = await post({
      name: 'Jordan Lee',
      email: 'jordan.lee@gmail.com',
      message: COMPLETE,
      token: 'bad',
    });
    expect(res.status).toBe(403);
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('rejects disposable email before send', async () => {
    const res = await post({
      name: 'Jordan Lee',
      email: 'temp@yopmail.com',
      message: COMPLETE,
      token: 'ok',
    });
    expect(res.status).toBe(400);
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('sends hire_me true when the hire checkbox is set', async () => {
    const res = await post({
      name: 'Jordan Lee',
      email: 'jordan.lee@gmail.com',
      message: COMPLETE,
      hiring: true,
      token: 'ok',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendContactMail).toHaveBeenCalledWith({
      name: 'Jordan Lee',
      email: 'jordan.lee@gmail.com',
      message: COMPLETE,
      hiring: true,
    });
  });

  it('defaults hire_me to false', async () => {
    const res = await post({
      name: 'Jordan Lee',
      email: 'jordan.lee@gmail.com',
      message: COMPLETE,
      token: 'ok',
    });
    expect(res.status).toBe(200);
    expect(sendContactMail).toHaveBeenCalledWith(
      expect.objectContaining({ hiring: false })
    );
  });
});
