'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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

export default function ContactForm({ isOpen, onClose, emailConfig }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const [footerHeight, setFooterHeight] = useState(60); // Default fallback
  const formRef = useRef<HTMLDivElement>(null);

  // Calculate footer height dynamically and determine if we need to account for it
  useEffect(() => {
    const calculateFooterHeight = () => {
      const footer = document.querySelector('footer');
      if (footer) {
        const rect = footer.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const footerHeight = rect.height;
        
        // Account for footer height on mobile devices (height < 700px) or when viewport is narrow
        // This ensures the send button is always visible on mobile
        if (viewportHeight < 700 || window.innerWidth < 768) {
          setFooterHeight(footerHeight + 20); // Increased padding for mobile (was 10)
        } else {
          setFooterHeight(0); // Don't reduce height on larger screens
        }
      }
    };

    // Calculate on mount and when window resizes
    calculateFooterHeight();
    window.addEventListener('resize', calculateFooterHeight);
    
    // Also recalculate when the component becomes visible
    if (isOpen) {
      // Use a small delay to ensure DOM is fully rendered
      setTimeout(calculateFooterHeight, 100);
    }

    return () => {
      window.removeEventListener('resize', calculateFooterHeight);
    };
  }, [isOpen]);

  // Handle touch/mouse events for swipe down to dismiss (only from drag handle)
  const handleStart = (clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
    setDragY(0);
  };

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    
    const deltaY = clientY - startY;
    if (deltaY > 0) { // Only allow downward drag
      setDragY(deltaY);
    }
  }, [isDragging, startY]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If dragged down more than 100px, close the form
    if (dragY > 100) {
      onClose();
    }
    
    setDragY(0);
  }, [isDragging, dragY, onClose]);

  // Touch events for drag handle only
  const handleDragHandleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    handleStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse events for drag handle only
  const handleDragHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    handleStart(e.clientY);
  };

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMove(e.clientY);
      };

      const handleGlobalMouseUp = () => {
        handleEnd();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, startY, dragY, handleEnd, handleMove]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          isOpen ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Contact Form */}
      <div 
        ref={formRef}
        className={`relative w-full bg-base01 rounded-t-3xl shadow-lg transform transition-all duration-500 ease-out ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-full scale-95'
        }`}
        style={{ 
          maxHeight: `calc(90vh - ${footerHeight}px)`, // Account for footer height dynamically
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), scale 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {/* Fixed X button - positioned on the left side */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 hover:bg-base0C rounded-full transition-all duration-300 z-30 bg-base0E backdrop-blur-sm shadow-md"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
          }}
          aria-label="Close contact form"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6 text-base00"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div 
          className={`relative p-4 sm:p-6 md:p-8 max-w-full sm:max-w-2xl mx-auto ${isDragging ? 'overflow-hidden' : 'overflow-y-auto'}`} 
          style={{ maxHeight: `calc(90vh - ${footerHeight}px)` }}
        >
          {/* Expanded Drag Area - Includes drag handle and title area for better swipe-to-dismiss usability */}
          <div 
            className="absolute top-0 left-0 right-0 h-24 flex flex-col justify-start items-center pt-2 pointer-events-none"
            onTouchStart={handleDragHandleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleDragHandleMouseDown}
          >
            {/* Visual drag handle */}
            <div className="w-12 h-1 bg-base03 rounded-full opacity-70 cursor-grab active:cursor-grabbing pointer-events-auto" aria-hidden="true" />
            {/* Invisible drag area that doesn't interfere with X button on the left - expanded to include title area */}
            <div className="absolute inset-0 pointer-events-auto" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 20% 100%)' }} />
          </div>

        <div className="flex justify-center items-center mb-4 sm:mb-6 pt-4 relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-base05">Contact Me</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="name" className="block text-base05 mb-2 text-sm sm:text-base">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 sm:p-3 rounded-lg bg-base02 text-base05 placeholder-base04 border border-base03 focus:border-base0D focus:outline-none transition-colors text-sm sm:text-base"
              placeholder="Your name"
              required
              disabled={status === 'sending'}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-base05 mb-2 text-sm sm:text-base">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 sm:p-3 rounded-lg bg-base02 text-base05 placeholder-base04 border border-base03 focus:border-base0D focus:outline-none transition-colors text-sm sm:text-base"
              placeholder="your.email@example.com"
              required
              disabled={status === 'sending'}
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-base05 mb-2 text-sm sm:text-base">
              Message
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full p-2 sm:p-3 rounded-lg bg-base02 text-base05 placeholder-base04 border border-base03 focus:border-base0D focus:outline-none transition-colors min-h-[120px] sm:min-h-[150px] text-sm sm:text-base resize-none"
              placeholder="Your message..."
              required
              disabled={status === 'sending'}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'sending'}
            className={`w-full py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 transform text-sm sm:text-base ${
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
          </button>
        </form>
        
        {/* Bottom padding to ensure content is not hidden behind footer - increased padding on mobile */}
        <div className="h-12 sm:h-6 md:h-8"></div>
        </div>
      </div>
    </div>
  );
}