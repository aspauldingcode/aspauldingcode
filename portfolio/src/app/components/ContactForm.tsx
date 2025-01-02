'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import emailjs from '@emailjs/browser';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  emailConfig: {
    serviceId: string;
    templateId: string;
    publicKey: string;
    recaptchaSiteKey: string;
  };
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function ContactForm({ isOpen, onClose, emailConfig }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const updateFormField = useCallback(
    debounce((field: keyof typeof formData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    }, 100),
    []
  );

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    // Update the input value immediately for responsiveness
    e.target.value = e.target.value;
    // Debounce the state update
    updateFormField(field, e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(emailConfig.recaptchaSiteKey, {
            action: 'submit'
          });

          // Verify the token with our API
          const verifyResponse = await fetch('/api/verify-recaptcha', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          const verifyData = await verifyResponse.json();

          if (!verifyData.success || verifyData.score < 0.5) {
            throw new Error('reCAPTCHA verification failed');
          }

          // If verification successful, send email
          await emailjs.send(
            emailConfig.serviceId,
            emailConfig.templateId,
            {
              to_name: 'Alex Spaulding',
              from_name: formData.name,
              email: formData.email,
              message: formData.message,
            },
            emailConfig.publicKey
          );

          setStatus('success');
          setFormData({ name: '', email: '', message: '' });
          setTimeout(() => {
            onClose();
            setStatus('idle');
          }, 2000);
        } catch (error) {
          console.error('Failed to process form:', error);
          setStatus('error');
          setTimeout(() => setStatus('idle'), 3000);
        }
      });
    } catch (error) {
      console.error('Failed to initialize reCAPTCHA:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <AnimatePresence mode="sync">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-base00 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-base01 rounded-t-3xl shadow-lg"
            style={{ maxHeight: "80vh" }}
          >
            <div className="p-8 max-w-2xl mx-auto overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-base05">Contact Me</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-base02 rounded-full transition-colors"
                  aria-label="Close contact form"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6 text-base05"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-base05 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    className="w-full p-3 rounded-lg bg-base02 text-base05 placeholder-base04 border border-base03 focus:border-base0D focus:outline-none transition-colors"
                    placeholder="Your name"
                    required
                    disabled={status === 'sending'}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-base05 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className="w-full p-3 rounded-lg bg-base02 text-base05 placeholder-base04 border border-base03 focus:border-base0D focus:outline-none transition-colors"
                    placeholder="your.email@example.com"
                    required
                    disabled={status === 'sending'}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-base05 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={handleInputChange('message')}
                    className="w-full p-3 rounded-lg bg-base02 text-base05 placeholder-base04 border border-base03 focus:border-base0D focus:outline-none transition-colors min-h-[150px]"
                    placeholder="Your message..."
                    required
                    disabled={status === 'sending'}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: status === 'sending' ? 1 : 1.02 }}
                  whileTap={{ scale: status === 'sending' ? 1 : 0.98 }}
                  type="submit"
                  disabled={status === 'sending'}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    status === 'sending' 
                      ? 'bg-base03 text-base04 cursor-not-allowed'
                      : status === 'success'
                      ? 'bg-base0B text-base00'
                      : status === 'error'
                      ? 'bg-base08 text-base00'
                      : 'bg-base0D text-base00 hover:bg-base0C'
                  }`}
                >
                  {status === 'sending' ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-base00" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : status === 'success' ? (
                    'Message Sent!'
                  ) : status === 'error' ? (
                    'Failed to Send'
                  ) : (
                    'Send Message'
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 