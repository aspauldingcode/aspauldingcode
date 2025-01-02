const SECRET_KEY = process.env.RECAPTCHA_SECRETKEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${token}`;

    const recaptchaRes = await fetch(verifyUrl, { method: "POST" });
    const recaptchaJson = await recaptchaRes.json();

    return new Response(JSON.stringify(recaptchaJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to verify reCAPTCHA',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 