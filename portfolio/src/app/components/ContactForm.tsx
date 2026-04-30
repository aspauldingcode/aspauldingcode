'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import emailjs from '@emailjs/browser';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';

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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMessageFocused, setIsMessageFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragY = useMotionValue(0);
  const dragControls = useDragControls();
  const backdropOpacity = useTransform(dragY, [0, 300], [0.6, 0]);
  const bp = useBreakpoints();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Mobile Detection
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
      textarea.style.height = 'auto';
      const maxHeight = isMobile ? 160 : 300;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [formData.message, isMobile]);

  // Body Scroll Lock
  useEffect(() => {
    if (!isMobile || status === 'success') return;
    const handleFocusScrollLock = () => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100dvh';
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

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isMobile) {
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
          const token = await window.grecaptcha.execute(emailConfig.recaptchaSiteKey, { action: 'submit' });
          const verifyResponse = await fetch('/api/verify-recaptcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          const verifyData = await verifyResponse.json();
          if (!verifyData.success || verifyData.score < 0.5) throw new Error('reCAPTCHA verification failed');

          await emailjs.send(
            emailConfig.serviceId,
            emailConfig.templateId,
            { to_name: 'Alex Spaulding', from_name: formData.name, email: formData.email, message: formData.message },
            emailConfig.publicKey
          );
          setStatus('success');
          setFormData({ name: '', email: '', message: '' });
          setTimeout(() => { onClose(); setStatus('idle'); }, 2000);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfirm) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Enter' || e.key.toLowerCase() === 'y') processSubmit();
        if (e.key === 'Escape' || e.key.toLowerCase() === 'n') setShowConfirm(false);
        return;
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [showConfirm, onClose, processSubmit]);

  const isFormValid = useCallback(() => {
    return formData.name.trim() !== '' && 
           formData.email.trim() !== '' && 
           /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && 
           formData.message.trim() !== '';
  }, [formData]);

  const handleInitialSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isFormValid()) {
      setValidationError(null);
      setShowConfirm(true);
    } else {
      if (!formData.name.trim()) setValidationError('NAME');
      else if (!formData.email.trim()) setValidationError('EMAIL');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) setValidationError('VALID EMAIL');
      else if (!formData.message.trim()) setValidationError('MESSAGE');
      setTimeout(() => setValidationError(null), 3000);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center p-0 sm:p-4 md:p-8 pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 pointer-events-auto overflow-hidden"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <div className="absolute inset-0 halftone-bg opacity-30 pointer-events-none" />
      </motion.div>

      <motion.div
        initial={{ y: 1000, rotate: 5, scale: 0.9 }}
        animate={{ y: 0, rotate: 0, scale: 1 }}
        exit={{ y: 1000, rotate: -5, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        style={{ y: dragY }}
        onDragEnd={handleDragEnd}
        className="relative w-full sm:max-w-2xl pointer-events-auto flex flex-col max-h-[95vh] sm:max-h-[90vh]"
      >
        <div className="absolute inset-0 bg-base08 translate-x-3 translate-y-3 opacity-60" style={{ clipPath: 'polygon(1% 0%, 99% 2%, 97% 98%, 0% 99%)' }} />
        <div className="absolute inset-0 bg-base00 translate-x-1.5 translate-y-1.5" style={{ clipPath: 'polygon(0% 2%, 98% 0%, 100% 98%, 2% 100%)' }} />

        <div className="relative bg-base01 overflow-hidden flex flex-col h-full" style={{ clipPath: 'polygon(0% 0%, 100% 1%, 98% 100%, 2% 98%)' }}>
          <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none" />

          <div onPointerDown={(e) => dragControls.start(e)} className="w-full relative bg-base08 py-6 px-8 cursor-grab active:cursor-grabbing shrink-0 touch-none flex items-center justify-between overflow-hidden">
            <div className="absolute inset-0 halftone-bg opacity-20 pointer-events-none" />
            <div className="relative flex flex-col">
              <h2 className="text-2xl sm:text-4xl font-black text-base00 uppercase italic tracking-tighter -skew-x-12 leading-none">Calling Card</h2>
              <div className="h-1 sm:h-1.5 w-32 bg-base00 mt-1 sm:mt-2 -skew-x-12" />
            </div>
            <button onClick={onClose} className="group/close relative p-2 transition-transform active:scale-90">
              <div className="absolute inset-0 bg-base00 -skew-x-12 translate-x-1 translate-y-1 opacity-50 group-hover/close:translate-x-1.5 group-hover/close:translate-y-1.5 transition-transform" />
              <div className="relative bg-base00 p-1.5 -skew-x-12 border-2 border-base09">
                <svg className="w-5 h-5 text-base09 skew-x-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-12 space-y-10 projects-scroll">
            <AnimatePresence mode="wait">
              {validationError && (
                <motion.div initial={{ opacity: 0, x: -100, skewX: -12 }} animate={{ opacity: 1, x: 0, skewX: -12 }} exit={{ opacity: 0, x: 100, skewX: -12 }} className="p-4 bg-base09 text-base00 font-black uppercase italic tracking-tighter text-center shadow-[4px_4px_0px_var(--base08)]">
                  <span className="skew-x-12 block">PLEASE ENTER {validationError}!</span>
                </motion.div>
              )}
              {status !== 'idle' && !validationError && (
                <motion.div initial={{ opacity: 0, x: -50, skewX: -12 }} animate={{ opacity: 1, x: 0, skewX: -12 }} exit={{ opacity: 0, x: 50, skewX: -12 }} className={`p-4 font-black uppercase italic tracking-tighter text-center ${status === 'sending' ? 'bg-base0D text-base00' : status === 'success' ? 'bg-base0B text-base00' : 'bg-base08 text-base00'}`}>
                  <span className="skew-x-12 block">{status === 'sending' ? 'ENCRYPTING MESSAGE...' : status === 'success' ? 'MESSAGE INFILTRATED SUCCESSFULLY!' : 'INFILTRATION FAILED. RETRY?'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleInitialSubmit} className="space-y-8">
              <div className="space-y-2 group/field">
                <label className="text-[10px] font-black uppercase italic tracking-widest text-base04 ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-base09 -skew-x-12" />Sender Name</label>
                <div className="relative">
                  <div className="absolute inset-0 bg-base00 -skew-x-2 translate-x-1 translate-y-1 opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} onFocus={handleFocus} className="relative w-full bg-base02 border-2 border-base03 px-4 py-3 text-base05 focus:border-base0D focus:outline-none transition-all -skew-x-2 font-kanit font-bold italic tracking-tight" placeholder="Your Name" disabled={status === 'sending'} />
                </div>
              </div>

              <div className="space-y-2 group/field">
                <label className="text-[10px] font-black uppercase italic tracking-widest text-base04 ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-base09 -skew-x-12" />Target Frequency</label>
                <div className="relative">
                  <div className="absolute inset-0 bg-base00 -skew-x-2 translate-x-1 translate-y-1 opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} onFocus={handleFocus} className="relative w-full bg-base02 border-2 border-base03 px-4 py-3 text-base05 focus:border-base0D focus:outline-none transition-all -skew-x-2 font-kanit font-bold italic tracking-tight" placeholder="your@email.com" disabled={status === 'sending'} />
                </div>
              </div>

              <div className="space-y-2 group/field">
                <label className="text-[10px] font-black uppercase italic tracking-widest text-base04 ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-base09 -skew-x-12" />Message Details</label>
                <div className="relative">
                  <div className="absolute inset-0 bg-base00 -skew-x-2 translate-x-1 translate-y-1 opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                  <textarea ref={textareaRef} required value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} onFocus={(e) => { handleFocus(e); setIsMessageFocused(true); }} onBlur={() => setIsMessageFocused(false)} onKeyDown={(e) => { if (!isMobile && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInitialSubmit(); } }} className="relative w-full bg-base02 border-2 border-base03 px-4 py-3 text-base05 focus:border-base0D focus:outline-none transition-all -skew-x-2 min-h-[120px] max-h-[160px] sm:max-h-[300px] resize-none overflow-y-auto font-kanit font-bold italic tracking-tight projects-scroll" placeholder="What's on your mind?" disabled={status === 'sending'} />
                </div>
              </div>

              <div className="relative group pt-4">
                <div className="p6-button-shadow" />
                <button type="submit" disabled={status === 'sending'} className="relative w-full p6-button py-4 bg-base09 hover:bg-base0A text-base00 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group-hover:translate-x-1 group-hover:translate-y-1 transition-all">
                  <span className="skew-x-12 font-black uppercase italic tracking-tighter text-xl">Deploy Inquiry</span>
                  <div className="relative skew-x-12">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>

        <AnimatePresence>
          {showConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-base00/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, rotate: -5 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.8, rotate: 5 }} className="relative bg-base01 p-8 border-4 border-base09 -skew-x-12 shadow-[10px_10px_0px_var(--base08)] max-w-sm w-full">
                <div className="skew-x-12 space-y-6">
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <span className="text-base08 font-black text-4xl italic tracking-tighter uppercase">READY?</span>
                    <div className="h-1 w-full bg-base09" />
                  </div>
                  <p className="text-base05 font-black uppercase italic tracking-tight text-center">The calling card is ready. Deploy to the destination?</p>
                  <div className="flex flex-col gap-3">
                    <button onPointerDown={() => processSubmit()} className="p6-button py-3 bg-base0B hover:bg-base0D text-base00 font-black uppercase italic tracking-widest text-sm"><span className="skew-x-12 block">EXECUTE [ENTER]</span></button>
                    <button onPointerDown={() => setShowConfirm(false)} className="p6-button py-3 bg-base02 hover:bg-base08 text-base05 font-black uppercase italic tracking-widest text-sm"><span className="skew-x-12 block">ABORT [ESC]</span></button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}