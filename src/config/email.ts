// Public site keys are safe to commit to the repo.
// EMAILJS_PRIVATE_KEY and RECAPTCHA_SECRETKEY stay in Vercel / .env.local.
// Send goes through /api/contact (HTTPS). We verify reCAPTCHA v3 ourselves.
// Leave EmailJS dashboard captcha off. That integration is reCAPTCHA v2 only
// and is not used here.
// EmailJS template fields: {{from_name}} {{from_email}} {{reply_to}} {{hire_me}} {{message}}
export const emailConfig = {
  serviceId: 'portfolio',
  templateId: 'aspauldingcode_portfolio',
  publicKey: '_yza7UlF2bRQN74hN',
  recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY || '6Lf_gKwqAAAAAA345u55OyMl2EYYy5DKAxEMzfPt',
} as const; 