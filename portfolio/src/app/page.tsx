"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ContactForm from './components/ContactForm';
import ThemeToggle from './components/ThemeToggle';
import { emailConfig } from '@/config/email';

export default function Home() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [useHorizontalLayout, setUseHorizontalLayout] = useState(false);
  const [useCompactButtons, setUseCompactButtons] = useState(false);
  const [useHorizontalButtons, setUseHorizontalButtons] = useState(false);
  const [useLargePortraitProfile, setUseLargePortraitProfile] = useState(false);

  const handleContactClick = () => {
    console.log('Contact button clicked');
    // Add 0.2 second delay for animation to complete
    setTimeout(() => {
      setIsContactOpen(true);
    }, 200);
  };



  const handleResumeClick = () => {
    console.log('Resume button clicked');
    // Add 0.2 second delay for animation to complete
    setTimeout(() => {
      window.open('/resume_alex_spaulding.pdf', '_blank');
    }, 200);
  };

  // Add useEffect to disable scrolling when the component mounts
  React.useEffect(() => {
    // Only disable scrolling if we're on the home page
    if (window.location.pathname === '/') {
      // Save the original overflow style
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocumentOverflow = document.documentElement.style.overflow;
      const originalBodyPosition = document.body.style.position;
      const originalBodyWidth = document.body.style.width;
      const originalBodyHeight = document.body.style.height;
      
      // Disable scrolling but allow touch interactions for buttons
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Re-enable scrolling when component unmounts
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocumentOverflow;
        document.body.style.position = originalBodyPosition;
        document.body.style.width = originalBodyWidth;
        document.body.style.height = originalBodyHeight;
      };
    }
  }, []);

  // Check if content would overflow viewport and require horizontal layout
  useEffect(() => {
    const checkViewportOverflow = () => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Estimate content height for vertical layout:
      // Profile image: ~160px (lg size) + margin
      // Title: ~72px (xl text) + margin  
      // Description: ~24px + margin
      // Buttons: ~56px + margin
      // Spacers and padding: ~100px
      // Footer: ~40px (when wrapping)
      // Total estimated: ~452px
      const estimatedVerticalContentHeight = 452;
      
      // Check for plenty of space (both width and height) to use large portrait profile
      // Need significant extra space beyond minimum requirements
      const hasAmpleWidth = viewportWidth >= 1200; // Large desktop width
      const hasAmpleHeight = viewportHeight >= 700; // Plenty of vertical space
      const hasAmpleSpace = hasAmpleWidth && hasAmpleHeight;
      setUseLargePortraitProfile(hasAmpleSpace);
      
      // Use horizontal layout if content would overflow viewport
      setUseHorizontalLayout(viewportHeight < estimatedVerticalContentHeight);
      
      // Check for both width AND height constraints
      const bothConstraintsActive = viewportHeight < estimatedVerticalContentHeight && viewportWidth < 768; // sm breakpoint
      
      // Check if buttons would overflow in horizontal layout
      if (viewportHeight < estimatedVerticalContentHeight) {
        // In horizontal layout, estimate total width needed:
        // Profile image: ~160px + margin (~20px)
        // Title/description section: ~300px minimum
        // Buttons (3 buttons): ~150px each = ~450px + gaps (~48px) = ~498px
        // Total estimated horizontal width: ~180px (profile) + ~300px (text) + ~498px (buttons) = ~978px
        const estimatedHorizontalContentWidth = 978;
        
        // Use compact buttons if horizontal content would overflow viewport width
        // OR if height is extremely limited (less than 400px including footer)
        const extremelyLimitedHeight = viewportHeight < 400;
        setUseCompactButtons(viewportWidth < estimatedHorizontalContentWidth || extremelyLimitedHeight);
        
        // Use horizontal button layout when both width and height are constrained
        setUseHorizontalButtons(bothConstraintsActive);
      } else {
        // In vertical layout, check if buttons would overflow vertically
        // Estimate button section height: 3 buttons * ~56px + gaps = ~200px
        // Check if adding buttons would push content out of viewport
        const contentWithoutButtons = estimatedVerticalContentHeight - 56; // Remove button estimate
        const buttonSectionHeight = 200; // Vertical button stack
        
        // Use compact buttons if content would overflow OR if height is extremely limited
        const extremelyLimitedHeight = viewportHeight < 450;
        setUseCompactButtons((contentWithoutButtons + buttonSectionHeight) > viewportHeight || extremelyLimitedHeight);
        setUseHorizontalButtons(false); // Never use horizontal buttons in vertical layout
      }
    };

    // Check on mount and resize
    checkViewportOverflow();
    window.addEventListener('resize', checkViewportOverflow);
    
    return () => window.removeEventListener('resize', checkViewportOverflow);
  }, []);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center bg-base00 overflow-hidden">
      <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        {/* Profile and Title Section - Responsive layout based on actual viewport overflow */}
        <div className="flex-shrink-0 mb-4 sm:mb-6 w-full max-w-2xl">
          {/* Use flex-row layout only when content would actually overflow viewport */}
          <div className={`flex items-center ${useHorizontalLayout ? 'flex-row justify-start gap-6' : 'flex-col'}`}>
            {/* Profile Image */}
            <div className={`flex-shrink-0 ${useHorizontalLayout ? 'mb-0' : 'mb-2'}`}>
              <div className="relative">
                <Image
                  src={useLargePortraitProfile ? "/profile_regular.jpg" : "/profile_square.jpg"}
                  alt="Profile picture"
                  width={useLargePortraitProfile ? 220 : 150}
                  height={useLargePortraitProfile ? 293 : 150}
                  className={
                    useLargePortraitProfile 
                      ? "rounded-2xl border-4 border-base02 w-44 h-60 object-cover"
                      : `rounded-full border-4 border-base02 ${
                          useHorizontalLayout 
                            ? 'w-16 h-16 sm:w-20 sm:h-20' 
                            : 'w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40'
                        }`
                  }
                  priority
                />
              </div>
            </div>

            {/* Title and Description */}
            <div className={`flex-grow ${useHorizontalLayout ? 'text-left' : 'text-center'}`}>
              <h1 className={`font-bold text-base05 ${
                useHorizontalLayout 
                  ? 'text-lg sm:text-xl md:text-2xl mb-1' 
                  : 'text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl mb-1 sm:mb-2 md:mb-4'
              }`}>
                Alex Spaulding
              </h1>
              <p className={`text-base04 ${
                useHorizontalLayout 
                  ? 'text-xs sm:text-sm max-w-none px-0' 
                  : 'text-xs sm:text-sm md:text-lg lg:text-xl max-w-xs sm:max-w-md md:max-w-2xl px-2'
              }`}>
                Software developer focused on building efficient, scalable solutions.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons Section - Bootstrap-like responsive grid */}
        <div className="flex-shrink-0 w-full max-w-2xl mx-auto">
          {/* Grid container - adapts based on viewport constraints */}
          <div className={`flex justify-center items-center ${
            useHorizontalButtons 
              ? 'flex-row gap-1 sm:gap-2' // Horizontal with reduced spacing when both width and height are limited
              : 'flex-col sm:flex-row gap-4 sm:gap-6' // Normal responsive behavior
          }`}>
            
            {/* Projects Button */}
            <div className={`transform -rotate-1 hover:rotate-0 transition-transform duration-300 ${
              useHorizontalButtons 
                ? 'flex-1 min-w-0' // Flexible width with reduced spacing for horizontal layout
                : 'w-full sm:w-auto sm:flex-1 max-w-xs' // Normal responsive sizing
            }`}>
              <Link 
                href="/projects"
                className={`inline-flex w-full justify-center rounded-lg shadow-lg transition-all duration-300 items-center hover:scale-105 bg-base0D hover:bg-base0E text-base00 ${
                  useCompactButtons 
                    ? 'px-2 py-2 text-xs' 
                    : useHorizontalButtons
                    ? 'px-4 py-4 text-lg sm:text-xl'
                    : 'px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg'
                } ${
                  useHorizontalButtons ? 'space-x-2' : 'space-x-2'
                }`}
              >
                <span>Projects</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`flex-shrink-0 ${
                    useCompactButtons 
                      ? 'w-3 h-3' 
                      : useHorizontalButtons
                      ? 'w-6 h-6 sm:w-7 sm:h-7'
                      : 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6'
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </Link>
            </div>

            {/* Resume Button */}
            <div className={`transform rotate-0.5 hover:rotate-0 transition-transform duration-300 ${
              useHorizontalButtons 
                ? 'flex-1 min-w-0' // Flexible width with reduced spacing for horizontal layout
                : 'w-full sm:w-auto sm:flex-1 max-w-xs' // Normal responsive sizing
            }`}>
              <button
                onClick={handleResumeClick}
                className={`inline-flex w-full justify-center rounded-lg shadow-lg transition-all duration-300 items-center hover:scale-105 bg-base0B hover:bg-base0A text-base00 ${
                  useCompactButtons 
                    ? 'px-2 py-2 text-xs' 
                    : useHorizontalButtons
                    ? 'px-4 py-4 text-lg sm:text-xl'
                    : 'px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg'
                } ${
                  useHorizontalButtons ? 'space-x-2' : 'space-x-2'
                }`}
              >
                <span>Resume</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`flex-shrink-0 ${
                    useCompactButtons 
                      ? 'w-3 h-3' 
                      : useHorizontalButtons
                      ? 'w-6 h-6 sm:w-7 sm:h-7'
                      : 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6'
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              </button>
            </div>

            {/* Contact Button */}
            <div className={`transform rotate-1 hover:rotate-0 transition-transform duration-300 ${
              useHorizontalButtons 
                ? 'flex-1 min-w-0' // Flexible width with reduced spacing for horizontal layout
                : 'w-full sm:w-auto sm:flex-1 max-w-xs' // Normal responsive sizing
            }`}>
              <button
                onClick={handleContactClick}
                className={`inline-flex w-full justify-center rounded-lg shadow-lg transition-all duration-300 items-center hover:scale-105 bg-base0C hover:bg-base0E text-base00 ${
                  useCompactButtons 
                    ? 'px-2 py-2 text-xs' 
                    : useHorizontalButtons
                    ? 'px-4 py-4 text-lg sm:text-xl'
                    : 'px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg'
                } ${
                  useHorizontalButtons ? 'space-x-2' : 'space-x-2'
                }`}
              >
                <span>Contact</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`flex-shrink-0 ${
                    useCompactButtons 
                      ? 'w-3 h-3' 
                      : useHorizontalButtons
                      ? 'w-6 h-6 sm:w-7 sm:h-7'
                      : 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6'
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Minimal spacer for very small screens - reduced when using horizontal layout */}
        <div className={`flex-shrink-0 ${useHorizontalLayout ? 'h-1' : 'h-2 sm:h-4 md:h-6'}`}></div>
      </div>

      <ThemeToggle />

      <ContactForm 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
        emailConfig={emailConfig}
      />
    </main>
  );
}
