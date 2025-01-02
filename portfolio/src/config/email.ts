// Public site keys are safe to commit to the repo.
// Private keys should be stored in .env.local and not committed to the repo.
export const emailConfig = {
  serviceId: 'portfolio',
  templateId: 'portfolio_email_template',
  publicKey: '_yza7UlF2bRQN74hN',
  recaptchaSiteKey: '6Lf_gKwqAAAAAA345u55OyMl2EYYy5DKAxEMzfPt'
} as const; 