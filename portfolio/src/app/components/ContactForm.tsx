'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import emailjs from '@emailjs/browser';
import { motion, AnimatePresence, PanInfo, useMotionValue, useDragControls } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { useFullscreenCloseHint } from '@/hooks/useFullscreenCloseHint';

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

const TITLEBAR_GRID_COLS = 22;
const TITLEBAR_GRID_ROWS = 6;

/** iOS WebKit (incl. iPad “desktop” UA) — used for scroll-lock + focus heuristics. */
function isBrowserIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iP(ad|hone|od)/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Stable angle 0–360° from grid cell — same on server + client. */
function titlebarCellAngle(row: number, col: number): number {
  const s = Math.sin(row * 12.9898 + col * 78.233 + 19.402);
  return (s * 180 + 180) % 360;
}

const CONTACT_TITLEBAR_PATTERN: { kind: 'star' | 'spiral'; deg: number }[] = (() => {
  const out: { kind: 'star' | 'spiral'; deg: number }[] = [];
  let i = 0;
  for (let r = 0; r < TITLEBAR_GRID_ROWS; r++) {
    for (let c = 0; c < TITLEBAR_GRID_COLS; c++) {
      out.push({
        kind: i % 2 === 0 ? 'star' : 'spiral',
        deg: titlebarCellAngle(r, c),
      });
      i++;
    }
  }
  return out;
})();

function ContactTitlebarStarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-[9px] h-[9px] sm:w-[10px] sm:h-[10px] shrink-0" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 1.5l2.8 8.6h9l-7.3 5.3 2.8 8.6-7.3-5.3-7.3 5.3 2.8-8.6-7.3-5.3h9z"
      />
    </svg>
  );
}

function ContactTitlebarSpiralGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="w-[9px] h-[9px] sm:w-[10px] sm:h-[10px] shrink-0" aria-hidden focusable="false">
      <path
        d="M8 10.2C5.6 10.2 4.8 7.8 6.2 6.5c1.5-1.4 4.2-.8 4.8 1.4.6 2.4-2 4.5-4.5 3.5-3.4-1.2-4-5.8-1-8 4-2.8 9.2-.7 10 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ContactForm({ onClose, emailConfig }: ContactFormProps) {
  const HINT_PADDING = 12;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  /** Narrow layout or coarse pointer — drives keyboard / scroll-in-view behavior. */
  const [isMobileForm, setIsMobileForm] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeHintTooltipRef = useRef<HTMLSpanElement | null>(null);
  const [isCloseHintVisible, setIsCloseHintVisible] = useState(false);
  const [closeHintPosition, setCloseHintPosition] = useState({ x: 0, y: 0 });
  const { closeHintKey } = useFullscreenCloseHint();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formScrollRef = useRef<HTMLDivElement>(null);
  const focusedFieldRef = useRef<HTMLElement | null>(null);
  const scrollAlignDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragY = useMotionValue(0);
  const dragControls = useDragControls();
  const isHeaderDraggingRef = useRef(false);
  const cancelDragRef = useRef(false);
  const bp = useBreakpoints();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const update = () => {
      setIsMobileForm(
        window.innerWidth < 640 || window.matchMedia('(pointer: coarse)').matches,
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Auto-expanding Textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = isMobileForm ? 160 : 300;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [formData.message, isMobileForm]);

  // Lock page scroll on mobile only — avoid `body { position: fixed }` on iOS: it desyncs `fixed`
  // portaled UI + native text fields from the visual viewport when the keyboard opens.
  useLayoutEffect(() => {
    if (!isMobileForm || status === 'success') return;
    const html = document.documentElement;
    const body = document.body;
    const prev = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
    };
  }, [isMobileForm, status]);

  /** Align focused field to top of modal scroll port (+ padding). Uses scrollTop math (not scrollIntoView) for stable iOS behavior. */
  const alignFocusedFieldToTopOfPort = useCallback(() => {
    if (!isMobileForm) return;
    const field = focusedFieldRef.current;
    const scrollEl = formScrollRef.current;
    if (!field || !scrollEl) return;

    const pad = 14;
    const scrollRect = scrollEl.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();

    const delta = fieldRect.top - scrollRect.top - pad;
    if (Math.abs(delta) < 2) return;

    const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    const nextTop = Math.max(0, Math.min(scrollEl.scrollTop + delta, maxScroll));
    scrollEl.scrollTo({ top: nextTop, behavior: 'auto' });
  }, [isMobileForm]);

  const scheduleAlignFocusedFieldToTop = useCallback(() => {
    if (!isMobileForm) return;
    if (scrollAlignDebounceRef.current !== null) {
      clearTimeout(scrollAlignDebounceRef.current);
    }
    const wait = isBrowserIOS() ? 72 : 40;
    scrollAlignDebounceRef.current = setTimeout(() => {
      scrollAlignDebounceRef.current = null;
      alignFocusedFieldToTopOfPort();
    }, wait);
  }, [isMobileForm, alignFocusedFieldToTopOfPort]);

  useEffect(() => {
    if (!isMobileForm || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onVVResize = () => scheduleAlignFocusedFieldToTop();
    vv.addEventListener('resize', onVVResize);
    return () => vv.removeEventListener('resize', onVVResize);
  }, [isMobileForm, scheduleAlignFocusedFieldToTop]);

  useEffect(() => {
    return () => {
      if (scrollAlignDebounceRef.current !== null) {
        clearTimeout(scrollAlignDebounceRef.current);
      }
    };
  }, []);

  const handleFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    focusedFieldRef.current = e.currentTarget;
    if (!isMobileForm) return;

    requestAnimationFrame(() => {
      alignFocusedFieldToTopOfPort();
    });
    scheduleAlignFocusedFieldToTop();
    if (isBrowserIOS()) {
      window.setTimeout(() => alignFocusedFieldToTopOfPort(), 300);
    }
  };

  const handleFieldBlur = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ae = typeof document !== 'undefined' ? document.activeElement : null;
        if (ae instanceof HTMLElement && formScrollRef.current?.contains(ae)) {
          return;
        }
        focusedFieldRef.current = null;
      });
    });
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
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (showConfirm) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Enter' || e.key.toLowerCase() === 'y') processSubmit();
        if (e.key === 'Escape' || e.key === '`' || e.code === 'Backquote' || e.key.toLowerCase() === 'n') setShowConfirm(false);
        return;
      }
      if (e.key === 'Escape' || e.key === '`' || e.code === 'Backquote') onClose();
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
    if (cancelDragRef.current) {
      cancelDragRef.current = false;
      dragY.set(0);
      return;
    }
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  };

  const beginHeaderDrag = (event: any) => {
    if (isMobileForm) return;
    isHeaderDraggingRef.current = true;
    cancelDragRef.current = false;
    dragControls.start(event);
  };

  const updateCloseHintPosition = useCallback(() => {
    const button = closeButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const anchorX = rect.left + rect.width / 2;
    const tooltipRect = closeHintTooltipRef.current?.getBoundingClientRect();
    const hintHalfWidth = Math.max(56, (tooltipRect?.width ?? 168) / 2);
    const hintHeight = Math.max(20, tooltipRect?.height ?? 28);
    const minX = HINT_PADDING + hintHalfWidth;
    const maxX = window.innerWidth - HINT_PADDING - hintHalfWidth;
    const minY = HINT_PADDING + hintHeight;
    const maxY = window.innerHeight - HINT_PADDING;
    setCloseHintPosition({
      x: maxX < minX ? window.innerWidth / 2 : Math.min(maxX, Math.max(minX, anchorX)),
      y: maxY < minY ? Math.max(HINT_PADDING, rect.top - 10) : Math.min(maxY, Math.max(minY, rect.top - 10)),
    });
  }, [HINT_PADDING]);

  const showCloseHint = useCallback(() => {
    setIsCloseHintVisible(true);
    requestAnimationFrame(() => {
      updateCloseHintPosition();
    });
  }, [updateCloseHintPosition]);

  useEffect(() => {
    if (!isCloseHintVisible || !bp.hasKeyboard) return;
    updateCloseHintPosition();
    const rafId = requestAnimationFrame(updateCloseHintPosition);
    window.addEventListener('resize', updateCloseHintPosition);
    window.addEventListener('scroll', updateCloseHintPosition, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateCloseHintPosition);
      window.removeEventListener('scroll', updateCloseHintPosition, true);
    };
  }, [isCloseHintVisible, bp.hasKeyboard, updateCloseHintPosition]);

  useEffect(() => {
    const resetDragging = () => {
      isHeaderDraggingRef.current = false;
    };
    const handleWindowMouseOut = (event: MouseEvent) => {
      if (!isHeaderDraggingRef.current) return;
      if (event.relatedTarget !== null) return;
      cancelDragRef.current = true;
      isHeaderDraggingRef.current = false;
      dragY.stop();
      dragY.set(0);
    };
    window.addEventListener('mouseup', resetDragging);
    window.addEventListener('mouseout', handleWindowMouseOut);
    return () => {
      window.removeEventListener('mouseup', resetDragging);
      window.removeEventListener('mouseout', handleWindowMouseOut);
    };
  }, [dragY]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center p-0 sm:p-4 md:p-8 pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-0 pointer-events-auto overflow-hidden"
        onClick={onClose}
      >
        <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-md" />
        <div className="absolute inset-0 z-0 halftone-bg opacity-30 pointer-events-none" />
      </motion.div>

      <motion.div
        initial={isMobileForm ? { opacity: 0 } : { y: 1000, rotate: 5, scale: 0.9 }}
        animate={isMobileForm ? { opacity: 1 } : { y: 0, rotate: 0, scale: 1 }}
        exit={isMobileForm ? { opacity: 0 } : { y: 1000, rotate: -5, scale: 0.9 }}
        transition={
          isMobileForm
            ? { duration: 0.22, ease: 'easeOut' }
            : { type: 'spring', damping: 25, stiffness: 200 }
        }
        drag={isMobileForm ? false : 'y'}
        dragControls={isMobileForm ? undefined : dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        style={isMobileForm ? undefined : { y: dragY }}
        onDragEnd={isMobileForm ? undefined : handleDragEnd}
        className="relative z-[50] flex min-h-0 w-full max-h-[min(88dvh,100svh)] flex-col pointer-events-auto will-change-[opacity] sm:max-h-[90vh] sm:max-w-2xl sm:will-change-auto"
      >
        <div className="absolute inset-0 bg-base08 translate-x-3 translate-y-3 opacity-60" style={{ clipPath: 'polygon(1% 0%, 99% 2%, 97% 98%, 0% 99%)', WebkitClipPath: 'polygon(1% 0%, 99% 2%, 97% 98%, 0% 99%)' } as React.CSSProperties} />
        <div className="absolute inset-0 bg-base00 translate-x-1.5 translate-y-1.5" style={{ clipPath: 'polygon(0% 2%, 98% 0%, 100% 98%, 2% 100%)', WebkitClipPath: 'polygon(0% 2%, 98% 0%, 100% 98%, 2% 100%)' } as React.CSSProperties} />

        <div
          className="relative flex min-h-0 flex-col h-full overflow-hidden bg-base01"
          style={
            isMobileForm
              ? undefined
              : ({
                  clipPath: 'polygon(0% 0%, 100% 1%, 98% 100%, 2% 98%)',
                  WebkitClipPath: 'polygon(0% 0%, 100% 1%, 98% 100%, 2% 98%)',
                } as React.CSSProperties)
          }
        >
          <div className="absolute inset-0 z-0 halftone-bg opacity-10 pointer-events-none" />

          <div onPointerDown={beginHeaderDrag} className={`w-full relative z-[1] bg-base08 py-6 px-8 shrink-0 touch-none flex items-center justify-between overflow-hidden ${isMobileForm ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
            {/* Diagonal grid of alternating stars / spirals — each cell has a unique rotation */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
              <div
                className="absolute left-1/2 top-1/2 text-base00/40"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${TITLEBAR_GRID_COLS}, 10px)`,
                  gridAutoRows: '10px',
                  columnGap: '11px',
                  rowGap: '12px',
                  width: 'max-content',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  transformOrigin: 'center',
                }}
              >
                {CONTACT_TITLEBAR_PATTERN.map((cell, idx) => (
                  <span
                    key={idx}
                    className="flex items-center justify-center w-[10px] h-[10px]"
                    style={{ transform: `rotate(${cell.deg}deg)` }}
                  >
                    {cell.kind === 'star' ? <ContactTitlebarStarGlyph /> : <ContactTitlebarSpiralGlyph />}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative z-[2] flex flex-col">
              <h2 className="text-2xl sm:text-4xl font-black text-base00 uppercase italic tracking-tighter -skew-x-12 leading-none">Calling Card</h2>
              <div className="h-1 sm:h-1.5 w-32 bg-base00 mt-1 sm:mt-2 -skew-x-12" />
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              onMouseEnter={() => {
                if (!bp.hasFinePointer) return;
                showCloseHint();
              }}
              onMouseLeave={() => {
                if (!bp.hasFinePointer) return;
                setIsCloseHintVisible(false);
              }}
              onFocus={() => {
                if (!bp.hasKeyboard) return;
                showCloseHint();
              }}
              onBlur={() => setIsCloseHintVisible(false)}
              className="group/close relative z-[2] p-2 transition-transform active:scale-90"
              aria-label="Abort form panel"
            >
              <div className="absolute inset-0 bg-base00 -skew-x-12 translate-x-1 translate-y-1 opacity-50 pointer-fine:group-hover/close:translate-x-1.5 pointer-fine:group-hover/close:translate-y-1.5 transition-transform" />
              <div className="relative bg-base00 p-1.5 -skew-x-12 border-2 border-base09">
                <svg className="w-5 h-5 text-base09 skew-x-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
            </button>
          </div>

          <div
            ref={formScrollRef}
            className="relative z-[1] flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-6 py-8 sm:px-10 sm:py-12 space-y-10 projects-scroll sm:scroll-smooth"
            style={
              {
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'contain',
              } as React.CSSProperties
            }
          >
            <AnimatePresence mode="wait">
              {status !== 'idle' && !validationError && (
                <motion.div initial={{ opacity: 0, x: -50, skewX: -12 }} animate={{ opacity: 1, x: 0, skewX: -12 }} exit={{ opacity: 0, x: 50, skewX: -12 }} className={`p-4 font-black uppercase italic tracking-tighter text-center ${status === 'sending' ? 'bg-base0D text-base00' : status === 'success' ? 'bg-base0B text-base00' : 'bg-base08 text-base00'}`}>
                  <span className="skew-x-12 block">{status === 'sending' ? 'ENCRYPTING MESSAGE...' : status === 'success' ? 'MESSAGE INFILTRATED SUCCESSFULLY!' : 'INFILTRATION FAILED. RETRY?'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleInitialSubmit} noValidate className="space-y-8">
              <div className="space-y-2 group/field">
                <AnimatePresence mode="wait">
                  {validationError === 'NAME' && (
                    <motion.div initial={{ opacity: 0, x: -100, skewX: -12 }} animate={{ opacity: 1, x: 0, skewX: -12 }} exit={{ opacity: 0, x: 100, skewX: -12 }} className="p-4 bg-base09 text-base00 font-black uppercase italic tracking-tighter text-center shadow-[4px_4px_0px_var(--base08)]">
                      <span className="skew-x-12 block">PLEASE ENTER NAME!</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <label className="text-[10px] font-black uppercase italic tracking-widest text-base04 ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-base09 -skew-x-12" />Sender Name</label>
                <div className="relative">
                  <div className="absolute inset-0 bg-base00 rounded-sm translate-x-1 translate-y-1 opacity-0 group-focus-within/field:opacity-100 transition-opacity pointer-events-none" aria-hidden />
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} onFocus={handleFieldFocus} onBlur={handleFieldBlur} className="relative w-full appearance-none rounded-sm bg-base02 border-2 border-base03 px-4 py-3 text-base text-base05 font-kanit font-medium not-italic leading-normal tracking-normal [font-synthesis:none] focus:border-base0D focus:outline-none transition-[border-color,box-shadow] scroll-my-4 touch-manipulation" placeholder="Your Name" disabled={status === 'sending'} />
                </div>
              </div>

              <div className="space-y-2 group/field">
                <AnimatePresence mode="wait">
                  {(validationError === 'EMAIL' || validationError === 'VALID EMAIL') && (
                    <motion.div initial={{ opacity: 0, x: -100, skewX: -12 }} animate={{ opacity: 1, x: 0, skewX: -12 }} exit={{ opacity: 0, x: 100, skewX: -12 }} className="p-4 bg-base09 text-base00 font-black uppercase italic tracking-tighter text-center shadow-[4px_4px_0px_var(--base08)]">
                      <span className="skew-x-12 block">PLEASE ENTER {validationError}!</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <label className="text-[10px] font-black uppercase italic tracking-widest text-base04 ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-base09 -skew-x-12" />Target Frequency</label>
                <div className="relative">
                  <div className="absolute inset-0 bg-base00 rounded-sm translate-x-1 translate-y-1 opacity-0 group-focus-within/field:opacity-100 transition-opacity pointer-events-none" aria-hidden />
                  <input type="email" required autoComplete="email" enterKeyHint="next" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} onFocus={handleFieldFocus} onBlur={handleFieldBlur} className="relative w-full appearance-none rounded-sm bg-base02 border-2 border-base03 px-4 py-3 text-base text-base05 font-kanit font-medium not-italic leading-normal tracking-normal [font-synthesis:none] focus:border-base0D focus:outline-none transition-[border-color,box-shadow] scroll-my-4 touch-manipulation" placeholder="your@email.com" disabled={status === 'sending'} />
                </div>
              </div>

              <div className="space-y-2 group/field">
                <AnimatePresence mode="wait">
                  {validationError === 'MESSAGE' && (
                    <motion.div initial={{ opacity: 0, x: -100, skewX: -12 }} animate={{ opacity: 1, x: 0, skewX: -12 }} exit={{ opacity: 0, x: 100, skewX: -12 }} className="p-4 bg-base09 text-base00 font-black uppercase italic tracking-tighter text-center shadow-[4px_4px_0px_var(--base08)]">
                      <span className="skew-x-12 block">PLEASE ENTER MESSAGE!</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <label className="text-[10px] font-black uppercase italic tracking-widest text-base04 ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-base09 -skew-x-12" />Message Details</label>
                <div className="relative">
                  <div className="absolute inset-0 bg-base00 rounded-sm translate-x-1 translate-y-1 opacity-0 group-focus-within/field:opacity-100 transition-opacity pointer-events-none" aria-hidden />
                  <textarea ref={textareaRef} required value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} onFocus={handleFieldFocus} onBlur={handleFieldBlur} onKeyDown={(e) => { if (!isMobileForm && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInitialSubmit(); } }} className="relative w-full appearance-none rounded-sm bg-base02 border-2 border-base03 px-4 py-3 text-base text-base05 font-kanit font-medium not-italic leading-normal tracking-normal [font-synthesis:none] focus:border-base0D focus:outline-none transition-[border-color,box-shadow] min-h-[120px] max-h-[160px] sm:max-h-[300px] resize-none overflow-y-auto projects-scroll scroll-my-4 touch-manipulation" placeholder="What's on your mind?" disabled={status === 'sending'} />
                </div>
              </div>

              <div className="relative group pt-4">
                <div className="p6-button-shadow" />
                <button type="submit" disabled={status === 'sending'} className="relative w-full p6-button py-4 bg-base09 hover:bg-base0A text-base00 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed pointer-fine:group-hover:translate-x-1 pointer-fine:group-hover:translate-y-1 transition-all">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[rgba(24,24,24,0.82)] backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, rotate: -5 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.8, rotate: 5 }} className="relative bg-base01 p-8 border-4 border-base09 -skew-x-12 shadow-[10px_10px_0px_var(--base08)] max-w-sm w-full">
                <div className="skew-x-12 space-y-6">
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <span className="text-base08 font-black text-4xl italic tracking-tighter uppercase">READY?</span>
                    <div className="h-1 w-full bg-base09" />
                  </div>
                  <p className="text-base05 font-black uppercase italic tracking-tight text-center">The calling card is ready. Deploy to the destination?</p>
                  <div className="flex flex-col gap-3">
                    <button onPointerDown={() => processSubmit()} className="p6-button py-3 bg-base0B hover:bg-base0D text-base00 font-black uppercase italic tracking-widest text-sm"><span className="skew-x-12 block">EXECUTE [ENTER]</span></button>
                    <button onPointerDown={() => setShowConfirm(false)} className="p6-button py-3 bg-base02 hover:bg-base08 text-base05 font-black uppercase italic tracking-widest text-sm"><span className="skew-x-12 block">ABORT [{closeHintKey}]</span></button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {bp.hasKeyboard && isCloseHintVisible && (
        <div
          className="fixed pointer-events-none z-[560]"
          style={{
            left: closeHintPosition.x,
            top: closeHintPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span ref={closeHintTooltipRef} className="p6-tooltip">
            <span className="p6-tooltip-text">ABORT [{closeHintKey}]</span>
          </span>
        </div>
      )}
    </div>,
    document.body
  );
}