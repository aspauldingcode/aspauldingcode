'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, useDragControls } from 'framer-motion';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface ContactFormProps {
  isOpen: boolean; // Kept for prop interface compatibility, though parent handles mounting
  onClose: () => void;
  emailConfig: {
    serviceId: string;
    templateId: string;
    publicKey: string;
    recaptchaSiteKey: string;
  };
}

export default function ContactForm({ onClose, emailConfig }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMessageFocused, setIsMessageFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragY = useMotionValue(0);
  const dragControls = useDragControls();
  const backdropOpacity = useTransform(dragY, [0, 300], [0.5, 0]);

  // Mobile Detection - Run only on mount to avoid resize flashing
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640 || window.matchMedia('(pointer: coarse)').matches);
    };
    checkMobile();
  }, []);

  // Auto-expanding Textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Small delay to ensure layout is ready
      textarea.style.height = 'auto';
      const maxHeight = isMobile ? 160 : 300;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [formData.message, isMobile]);

  // Body Scroll Lock for iOS Spacebar Bug
  useEffect(() => {
    if (!isMobile || status === 'success') return;

    const handleFocusScrollLock = () => {
      const active = document.activeElement;
      const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

      if (isInput) {
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100dvh'; // Lock height to prevent keyboard resizing shifts
      } else {
        document.body.style.overflow = '';
        document.body.style.height = '';
      }
    };

    window.addEventListener('focusin', handleFocusScrollLock);
    window.addEventListener('focusout', handleFocusScrollLock);

    return () => {
      window.removeEventListener('focusin', handleFocusScrollLock);
      window.removeEventListener('focusout', handleFocusScrollLock);
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isMobile, status]);


  // optimized Focus Scrolling - Keeps modal stable while moving input into view
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isMobile) {
      // Small delay to wait for browser keyboard handling
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  };
  const processSubmit = useCallback(async () => {
    setShowConfirm(false);
    setStatus('sending');

    try {
      if (typeof window === 'undefined' || !window.grecaptcha) {
        throw new Error('reCAPTCHA not available');
      }

      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(emailConfig.recaptchaSiteKey, {
            action: 'submit'
          });

          const verifyResponse = await fetch('/api/verify-recaptcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          const verifyData = await verifyResponse.json();

          if (!verifyData.success || verifyData.score < 0.5) {
            throw new Error('reCAPTCHA verification failed');
          }

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
  }, [emailConfig, formData, onClose]);

  // Keyboard Interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If confirmation dialog is open, trap keys
      if (showConfirm) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Enter' || e.key.toLowerCase() === 'y') {
          processSubmit();
        }
        if (e.key === 'Escape' || e.key.toLowerCase() === 'n') {
          setShowConfirm(false);
        }
        return;
      }

      // Normal Form Interaction
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [showConfirm, onClose, processSubmit]);

  // Initial Form Submit (Triggered by form or Enter)
  const handleInitialSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowConfirm(true);
  };



  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center pointer-events-none">
      {/* Backdrop Container - Handles entry/exit animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      >
        {/* Real-time Backdrop - Syncs with dragY */}
        <motion.div
          style={{ opacity: backdropOpacity }}
          className="absolute top-0 left-0 right-0 bottom-7 sm:bottom-9 bg-black/50 backdrop-blur-sm"
        />
      </motion.div>

      <motion.div
        initial={{ y: 1000 }}
        animate={{ y: 0 }}
        exit={{ y: 1000 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        style={{ y: dragY }}
        onDragEnd={handleDragEnd}
        className="relative w-full sm:max-w-xl bg-base01 rounded-t-3xl sm:rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Draggable Header Area */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="w-full relative pt-2 pb-6 cursor-grab active:cursor-grabbing shrink-0 touch-none px-4"
        >
          {/* Drag Handle Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-1.5 bg-base03 rounded-full opacity-50" />
          </div>

          {/* Close Button - Pulled into header area */}
          <div className="absolute top-2 right-4 flex flex-col items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full text-base05 transition-all duration-200 shadow-sm touch-manipulation"
              title="Close (esc)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-[10px] font-mono text-base04 opacity-50 mt-1 pointer-events-none whitespace-nowrap bg-base01/50 px-1 rounded">(esc)</span>
          </div>

          {/* Title Area - Center Aligned */}
          <div className="flex flex-col items-center pointer-events-none">
            <h2 className="text-xl font-bold text-base05">Contact Alex</h2>
            <p className="text-base04 text-xs mt-0.5 opacity-70">Leave a message and I&apos;ll get back to you.</p>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 sm:px-8 py-0 custom-scrollbar overflow-y-auto">

          <form onSubmit={handleInitialSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-base05 ml-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                onFocus={handleFocus}
                className="w-full bg-base02 border border-base03 rounded-lg px-4 py-3 text-base05 focus:border-base0D focus:outline-none transition-colors"
                placeholder="Your name"
                disabled={status === 'sending'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-base05 ml-1">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                onFocus={handleFocus}
                className="w-full bg-base02 border border-base03 rounded-lg px-4 py-3 text-base05 focus:border-base0D focus:outline-none transition-colors"
                placeholder="your@email.com"
                disabled={status === 'sending'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-base05 ml-1">Message</label>
              <textarea
                ref={textareaRef}
                required
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                onFocus={(e) => {
                  handleFocus(e);
                  setIsMessageFocused(true);
                }}
                onBlur={() => setIsMessageFocused(false)}
                onKeyDown={(e) => {
                  // User request: Enter triggers send prompt (unless Shift is held)
                  // On mobile, Enter simply adds a newline
                  if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleInitialSubmit();
                  }
                }}
                className="w-full bg-base02 border border-base03 rounded-lg px-4 py-3 text-base05 focus:border-base0D focus:outline-none transition-colors min-h-[120px] max-h-[160px] sm:max-h-[300px] resize-none overflow-y-auto custom-scrollbar"
                placeholder="What&apos;s on your mind?"
                disabled={status === 'sending'}
              />
              {!isMobile && (
                <div className="flex justify-start px-1">
                  <span className="text-[10px] text-base03">Shift+Enter for new line</span>
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={status === 'sending' || status === 'success'}
              className={`w-full py-3 rounded-lg font-bold text-base00 transition-colors flex items-center justify-center gap-2 ${status === 'success' ? 'bg-base0B' :
                status === 'error' ? 'bg-base08' :
                  'bg-base0D hover:bg-base0C'
                }`}
            >
              {status === 'sending' ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending...</span>
                </>
              ) : status === 'success' ? 'Sent!' : status === 'error' ? 'Error - Try Again' : 'Send Message'}
            </motion.button>

            {!isMobile && (
              <div className="flex justify-center mt-2">
                <span className="text-[10px] font-mono text-base04 opacity-50 uppercase tracking-widest">(Enter) to send</span>
              </div>
            )}
          </form>

          {/* Safe Area Padding - Increased for mobile to allow scrolling past keyboard */}
          <div className="h-64 sm:h-2" />
        </div>

        {/* Confirmation Overlay */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-base00/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="bg-base01 border-2 border-base0D rounded-2xl p-6 shadow-2xl max-w-sm w-full">
                <h3 className="text-xl font-bold text-base05 mb-2">Ready to send?</h3>
                {!isMobile && (
                  <p className="text-base04 text-sm mb-6">
                    Press <span className="text-base0D font-mono bg-base02 px-1 rounded">Shift+Enter</span> to add a new line.<br />
                    Press <span className="text-base0D font-mono bg-base02 px-1 rounded">Enter</span> or <span className="text-base0B font-mono bg-base02 px-1 rounded">y</span> to send now.
                  </p>
                )}
                {isMobile && <div className="mb-6" />}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2 rounded-lg bg-base02 hover:bg-base03 text-base05 font-semibold transition-colors touch-manipulation"
                  >
                    Cancel (n / Esc)
                  </button>
                  <button
                    onClick={processSubmit}
                    className="flex-1 py-2 rounded-lg bg-base0D hover:bg-base0C text-base00 font-bold transition-colors shadow-lg touch-manipulation"
                  >
                    Send (y / Enter)
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}