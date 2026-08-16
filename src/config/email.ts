// Public site keys are safe to commit to the repo.
// EMAILJS_PRIVATE_KEY stays in .env.local / Vercel. Send goes through /api/contact (HTTPS).
// EmailJS template fields: {{from_name}} {{from_email}} {{reply_to}} {{hire_me}} {{message}}
export const emailConfig = {
  serviceId: 'portfolio',
  templateId: 'portfolio_email_template',
  publicKey: '_yza7UlF2bRQN74hN',
  recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY || ''
} as const; 