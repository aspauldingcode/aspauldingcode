import emailjs from '@emailjs/nodejs';
import { emailConfig } from '@/config/email';

export type ContactMail = {
  name: string;
  email: string;
  message: string;
  hiring: boolean;
};

/**
 * Send through EmailJS HTTPS from the server (TLS).
 * Template fields: from_name, from_email, reply_to, hire_me, message.
 */
export function contactTemplateParams(mail: ContactMail) {
  const hireMe = mail.hiring ? 'true' : 'false';
  return {
    from_name: mail.name,
    from_email: mail.email,
    reply_to: mail.email,
    hire_me: hireMe,
    message: `Wants to hire Alex: ${hireMe}\nReply to: ${mail.email}\n\n${mail.message}`,
  };
}

export async function sendContactMail(mail: ContactMail): Promise<void> {
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Contact form is misconfigured.');
  }

  try {
    await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templateId,
      contactTemplateParams(mail),
      {
        publicKey: emailConfig.publicKey,
        privateKey,
      }
    );
  } catch (err) {
    const rec = err && typeof err === 'object' ? (err as { text?: string; status?: number }) : null;
    const text = rec?.text || (err instanceof Error ? err.message : 'EmailJS send failed');
    throw new Error(text);
  }
}
