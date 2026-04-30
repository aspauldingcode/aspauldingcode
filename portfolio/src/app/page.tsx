"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import ContactForm from './components/ContactForm';
import ResumeViewer from './components/ResumeViewer';
import { emailConfig } from '@/config/email';
import { useSession } from './context/SessionContext';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { resolveImageUrl } from '@/lib/imageUrl';

function FloatingShapes() {
  const shapes = [
    // P1/P2: Gothic Butterfly (Outline)
    <svg key="p12" viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[2]">
      <path d="M50 50 L30 20 Q 10 10, 10 40 L30 50 L10 60 Q 10 90, 30 80 L50 50 L70 20 Q 90 10, 90 40 L70 50 L90 60 Q 90 90, 70 80 Z" strokeLinejoin="round" />
    </svg>,
    // P3: Moon & Gear (Outline)
    <svg key="p3" viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[2]">
      <path d="M30 20 A 40 40 0 1 0 30 80 A 30 30 0 1 1 30 20" />
      <circle cx="55" cy="50" r="10" strokeDasharray="4 2" />
    </svg>,
    // P4: TV Frame (Outline)
    <svg key="p4" viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[2.5]">
      <rect x="15" y="25" width="70" height="55" rx="5" />
      <path d="M35 25 L25 10 M65 25 L75 10" strokeLinecap="round" />
      <path d="M25 35 L75 35" opacity="0.3" />
    </svg>,
    // P5: Phantom Star (20-point rounded uneven - Outline)
    <svg key="p5" viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[2]">
      <path d="M50 5 L55 35 L85 25 L65 45 L95 55 L65 65 L85 85 L55 75 L50 95 L45 75 L15 85 L35 65 L5 55 L35 45 L15 25 L45 35 Z" strokeLinejoin="round" />
    </svg>
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Top Left Hero Shape - Multi-Era Composition */}
      <motion.div
        initial={{ rotate: 0, scale: 0.8, x: '-20%', y: '-20%' }}
        animate={{ 
          rotate: [0, 90, 180, 270, 360],
          scale: [0.8, 1.1, 0.8],
        }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-0 w-80 h-80 text-base08 opacity-10"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[1] filter blur-[0.5px]">
          <circle cx="50" cy="50" r="45" strokeDasharray="10 5" />
          <path d="M50 5 L55 35 L85 25 L65 45 L95 55 L65 65 L85 85 L55 75 L50 95 L45 75 L15 85 L35 65 L5 55 L35 45 L15 25 L45 35 Z" strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 10 L90 20 L80 90 L20 80 Z" strokeWidth="1" strokeDasharray="5 5" />
        </svg>
      </motion.div>

      {/* Floating Debris */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: Math.random() * 100 + '%',
            rotate: Math.random() * 360,
            scale: 0.5 + Math.random() * 1,
            opacity: 0.05
          }}
          animate={{ 
            y: ['-20%', '120%'],
            rotate: [0, 360],
          }}
          transition={{ 
            duration: 25 + Math.random() * 40, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className={`absolute w-16 h-16 sm:w-24 sm:h-24 ${i % 2 === 0 ? 'text-base09' : 'text-base08'}`}
        >
          {shapes[i % shapes.length]}
        </motion.div>
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const regularProfileSrc = useMemo(() => resolveImageUrl('/profile_regular.jpg'), []);
  const squareProfileSrc = useMemo(() => resolveImageUrl('/profile_square.jpg'), []);

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isNavigatingProjects, setIsNavigatingProjects] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const { resumeBase64 } = useSession();

  // Get breakpoint state for smooth Framer Motion transitions
  const bp = useBreakpoints();

  // Quick, smooth spring transition for responsive animations
  const springTransition = { type: "spring" as const, damping: 25, stiffness: 200 };

  // Calculate responsive values based on current viewport
  const responsiveStyles = useMemo(() => {
    const { height, width, isMounted, isSm, isMd, isLg, isXl, hasKeyboard } = bp;

    // Use a base scaling factor derived from height to ensure fit
    // We target a "comfortable" fit for height >= 600px
    const hScale = Math.min(1, Math.max(0.4, height / 800));
    const wScale = Math.min(1, Math.max(0.4, width / 1200));
    
    // Global constraint scale
    const scale = Math.min(hScale, wScale);

    // Profile image size - strictly tied to height to prevent vertical overflow
    // Base portrait is 176x224, square is 160
    // On very short screens, we prioritize fitting everything
    const portraitSize = {
      w: Math.floor(Math.min(176, height * 0.22)),
      h: Math.floor(Math.min(224, height * 0.28))
    };
    const squareSize = Math.floor(Math.min(160, height * 0.2));

    // Show portrait only if height is sufficient (>= 500px)
    const showPortrait = height >= 500;

    // Dynamic padding and margins
    const containerPadding = { 
      x: Math.max(16, Math.floor(32 * scale)), 
      y: Math.max(12, Math.floor(32 * scale)) 
    };
    
    const profileMarginBottom = Math.max(8, Math.floor(32 * hScale));
    
    // Layout decisions
    const useHorizontalLayout = height < 450 && width > 600;
    const buttonsHorizontal = width > 640 || (height < 500 && width > 500);

    // Typography
    const titleSize = Math.max(0.8, 2 * scale); // rem
    const descSize = Math.max(0.7, 1 * scale); // rem

    // Interaction spacing
    const buttonGap = Math.max(12, Math.floor((isSm ? 56 : 24) * scale));

    return {
      containerPadding,
      profileMarginBottom,
      useHorizontalLayout,
      portraitSize,
      squareSize,
      showPortrait,
      titleSize,
      descSize,
      buttonGap,
      buttonsHorizontal,
      hasKeyboard,
    };
  }, [bp]);
 // bp object changes when isMounted changes, triggering recompute

  useEffect(() => {
    const warmProfileImages = () => {
      [regularProfileSrc, squareProfileSrc].forEach((src) => {
        const img = new window.Image();
        img.src = src;
        if (img.decode) {
          img.decode().catch(() => {
            // Ignore decode failures; browser cache warm-up still helps.
          });
        }
      });
    };

    const timer = window.setTimeout(warmProfileImages, 250);
    return () => window.clearTimeout(timer);
  }, [regularProfileSrc, squareProfileSrc]);

  useEffect(() => {
    setProfileLoaded(false);
  }, [responsiveStyles.showPortrait]);

  const handleContactClick = () => setIsContactOpen(true);
  const handleResumeClick = () => setIsResumeOpen(true);
  const handleProjectsClick = useCallback(() => {
    if (isNavigatingProjects) return;
    setIsNavigatingProjects(true);
    router.push('/projects');
  }, [isNavigatingProjects, router]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused or modifiers are used
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'p') handleProjectsClick();
      if (key === 'r') handleResumeClick();
      if (key === 'c') handleContactClick();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleProjectsClick]);

  // Don't render responsive content until we have real client dimensions
  // This prevents flash of incorrectly-sized elements during hydration
  if (!bp.isMounted) {
    return (
      <main className="fixed inset-0 min-h-[100dvh] flex flex-col items-center justify-center bg-base00 overflow-hidden touch-none" />
    );
  }

  return (
    <main
      className="fixed inset-0 min-h-[100dvh] flex flex-col items-center justify-center bg-base00 overflow-hidden touch-none pb-24"
    >
      {/* Persona Background Elements */}
      <FloatingShapes />
      <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none z-0" />

      <LayoutGroup>
        <motion.div
          layout
          initial={false}
          animate={{
            paddingLeft: responsiveStyles.containerPadding.x,
            paddingRight: responsiveStyles.containerPadding.x,
            paddingTop: responsiveStyles.containerPadding.y,
            paddingBottom: responsiveStyles.containerPadding.y,
          }}
          transition={springTransition}
          className="relative flex flex-col items-center justify-center h-full w-full max-w-4xl max-h-full mx-auto overflow-hidden z-10"
        >
          {/* Profile and Title Section */}
          <motion.div
            layout
            initial={false}
            animate={{ marginBottom: responsiveStyles.profileMarginBottom }}
            transition={springTransition}
            className="flex-shrink-0 w-full max-w-2xl mx-auto flex flex-col items-center"
          >
            <motion.div
              layout
              initial={false}
              transition={springTransition}
              className={responsiveStyles.useHorizontalLayout ? "block w-fit" : "flex flex-col items-center w-fit"}
            >
              {/* Profile Image Container - Persona Stylized */}
              <motion.div
                layout
                initial={false}
                animate={{
                  marginBottom: responsiveStyles.useHorizontalLayout ? 0 : 8,
                  marginRight: responsiveStyles.useHorizontalLayout ? 32 : 0,
                  rotate: responsiveStyles.useHorizontalLayout ? -2 : 0,
                }}
                transition={springTransition}
                className="flex-shrink-0"
                style={{
                  float: responsiveStyles.useHorizontalLayout ? 'left' : 'none',
                  shapeOutside: responsiveStyles.useHorizontalLayout ? 'margin-box' : 'none',
                }}
              >
                <motion.div
                  layoutId="profile-image"
                  initial={false}
                  animate={{
                    width: responsiveStyles.showPortrait ? responsiveStyles.portraitSize.w : responsiveStyles.squareSize,
                    height: responsiveStyles.showPortrait ? responsiveStyles.portraitSize.h : responsiveStyles.squareSize,
                  }}
                  transition={springTransition}
                  className="relative border-4 border-base09 bg-base01 shadow-[12px_12px_0px_var(--base08)] overflow-hidden -skew-x-2"
                >
                  <Image
                    src={responsiveStyles.showPortrait ? regularProfileSrc : squareProfileSrc}
                    alt="Profile"
                    fill
                    className={`object-cover w-full h-full transition-all duration-700 ${profileLoaded ? 'blur-0 opacity-90 scale-100' : 'blur-xl opacity-0 scale-110'}`}
                    priority
                    onLoad={() => setProfileLoaded(true)}
                  />
                  <div className="absolute inset-0 halftone-bg opacity-30 mix-blend-overlay pointer-events-none" />
                </motion.div>
              </motion.div>

              {/* Title and Description - Persona Kinetic */}
              <motion.div
                layout
                transition={springTransition}
                style={{ textAlign: responsiveStyles.useHorizontalLayout ? 'left' : 'center' }}
                className="mt-4 sm:mt-6"
              >
                <div className="relative inline-block mb-6">
                  {/* Layered Shadows */}
                  <div className="absolute inset-0 bg-base09 -skew-x-12 translate-x-3 translate-y-2 opacity-30" />
                  <div className="absolute inset-0 bg-base08 -skew-x-12 translate-x-1.5 translate-y-1 opacity-50" />
                  
                  {/* Main Title Box */}
                  <div className="relative bg-base00 border-2 border-base05 px-8 py-3 -skew-x-12 shadow-2xl">
                    <motion.h1
                      initial={false}
                      animate={{ fontSize: `${responsiveStyles.titleSize * 1.5}rem` }}
                      transition={springTransition}
                      className="font-black text-base05 leading-none uppercase italic tracking-tighter"
                    >
                      Alex Spaulding
                    </motion.h1>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-base09 opacity-50 hidden sm:block" />
                  <motion.p
                    initial={false}
                    animate={{ fontSize: `${responsiveStyles.descSize * 1.2}rem` }}
                    transition={springTransition}
                    className="text-base05 max-w-md font-black uppercase italic tracking-tight leading-[1.1]"
                  >
                    Computer Science student at Eastern Washington University currently exploring <span className="text-base09 underline decoration-4">macOS reverse engineering</span> and UI design tweaks.
                  </motion.p>
                </div>
              </motion.div>

              {responsiveStyles.useHorizontalLayout && <div style={{ clear: 'both' }} />}
            </motion.div>
          </motion.div>

          {/* Persona Menu Divider */}
          <motion.div
            initial={false}
            animate={{
              marginTop: responsiveStyles.profileMarginBottom,
              marginBottom: responsiveStyles.profileMarginBottom * 2,
            }}
            transition={springTransition}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-6 px-8"
          >
            <div className="h-[3px] flex-1 bg-base02 -skew-x-12" />
            <div className="relative bg-base09 px-5 py-1 shadow-[6px_6px_0px_var(--base08)] -skew-x-12 border-2 border-base00">
              <span className="text-xs font-black text-base00 uppercase italic tracking-[0.3em] skew-x-12 block ml-1">Menu</span>
            </div>
            <div className="h-[3px] flex-1 bg-base02 -skew-x-12" />
          </motion.div>

          {/* Buttons Section - Persona Style Grid */}
          <motion.div
            layout
            transition={springTransition}
            className="flex-shrink-0 w-full max-w-3xl mx-auto"
          >
            <motion.div
              layout
              initial={false}
              animate={{
                flexDirection: responsiveStyles.buttonsHorizontal ? 'row' : 'column',
              }}
              transition={springTransition}
              className="flex justify-center items-center"
              style={{ gap: responsiveStyles.buttonGap }}
            >
              {/* Projects Button */}
              <div className="relative group/btn w-full sm:w-auto">
                <div className="p6-button-shadow" />
                <motion.button
                  onTap={handleProjectsClick}
                  className="relative p6-button px-10 py-4 bg-base0D hover:bg-base0C text-base00 flex items-center justify-center gap-4 disabled:opacity-50"
                  disabled={isNavigatingProjects}
                >
                  <span className="skew-x-12 font-black uppercase italic tracking-tighter text-xl">
                    Projects
                  </span>
                  <div className="relative skew-x-12">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </motion.button>
                {responsiveStyles.hasKeyboard && (
                  <div className="p6-tooltip -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity">
                    <span className="p6-tooltip-text">EXPLORE [P]</span>
                  </div>
                )}
              </div>

              {/* Resume Button */}
              <div className="relative group/btn w-full sm:w-auto">
                <div className="p6-button-shadow" />
                <motion.button
                  onTap={handleResumeClick}
                  className="relative p6-button px-10 py-4 bg-base0B hover:bg-base0A text-base00 flex items-center justify-center gap-4"
                >
                  <span className="skew-x-12 font-black uppercase italic tracking-tighter text-xl">
                    Resume
                  </span>
                  <div className="relative skew-x-12">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                </motion.button>
                {responsiveStyles.hasKeyboard && (
                  <div className="p6-tooltip -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity">
                    <span className="p6-tooltip-text">DOSSIER [R]</span>
                  </div>
                )}
              </div>

              {/* Contact Button */}
              <div className="relative group/btn w-full sm:w-auto">
                <div className="p6-button-shadow" />
                <motion.button
                  onTap={handleContactClick}
                  className="relative p6-button px-10 py-4 bg-base0E hover:bg-base0F text-base00 flex items-center justify-center gap-4"
                >
                  <span className="skew-x-12 font-black uppercase italic tracking-tighter text-xl">
                    Contact
                  </span>
                  <div className="relative skew-x-12">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                </motion.button>
                {responsiveStyles.hasKeyboard && (
                  <div className="p6-tooltip -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity">
                    <span className="p6-tooltip-text">MESSAGE [C]</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </LayoutGroup>

      <AnimatePresence>
        {isContactOpen && (
          <ContactForm
            key="contact-form"
            isOpen={isContactOpen}
            onClose={() => setIsContactOpen(false)}
            emailConfig={emailConfig}
          />
        )}
        {isResumeOpen && (
          <ResumeViewer
            key="resume-viewer"
            onCheckClose={() => setIsResumeOpen(false)}
            cachedResume={resumeBase64}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
