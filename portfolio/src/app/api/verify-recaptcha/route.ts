const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

export async function POST(request: Request) {
  if (!RECAPTCHA_SECRET_KEY) {
    console.error('reCAPTCHA secret key not configured');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'reCAPTCHA secret key not configured' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { token } = await request.json();
    
    if (!token) {
      console.error('No reCAPTCHA token provided');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No reCAPTCHA token provided' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Verifying token with reCAPTCHA...');
    // Verify the token with Google's reCAPTCHA API
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    console.log('reCAPTCHA response:', data);

    if (data.success && data.score >= 0.5) {
      return new Response(JSON.stringify({ success: true, score: data.score }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.error('reCAPTCHA verification failed:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'reCAPTCHA verification failed',
        details: data,
        score: data.score 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Failed to verify reCAPTCHA:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to verify reCAPTCHA',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 