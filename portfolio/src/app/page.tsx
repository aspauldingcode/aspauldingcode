"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import ContactForm from './components/ContactForm';
import { emailConfig } from '@/config/email';
import { useSession } from './context/SessionContext';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { resolveImageUrl } from '@/lib/imageUrl';

const ResumeViewer = dynamic(() => import('./components/ResumeViewer'), { ssr: false });

function FloatingShapes() {
  const seeded = (seed: number) => {
    const value = Math.sin(seed * 9999.91) * 10000;
    return value - Math.floor(value);
  };

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
        (() => {
          const xSeed = seeded(i + 1);
          const ySeed = seeded(i + 11);
          const rotSeed = seeded(i + 21);
          const scaleSeed = seeded(i + 31);
          const durationSeed = seeded(i + 41);
          return (
        <motion.div
          key={i}
          initial={{ 
            x: `${(xSeed * 100).toFixed(3)}%`, 
            y: `${(ySeed * 100).toFixed(3)}%`,
            rotate: Number((rotSeed * 360).toFixed(3)),
            scale: Number((0.5 + scaleSeed).toFixed(3)),
            opacity: 0.05
          }}
          animate={{ 
            y: ['-20%', '120%'],
            rotate: [0, 360],
          }}
          transition={{ 
            duration: Number((25 + durationSeed * 40).toFixed(3)), 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className={`absolute w-16 h-16 sm:w-24 sm:h-24 ${i % 2 === 0 ? 'text-base09' : 'text-base08'}`}
        >
          {shapes[i % shapes.length]}
        </motion.div>
          );
        })()
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

  // Compact responsive state machine: fewer branches, same intent.
  const responsiveStyles = useMemo(() => {
    const { height, width, hasKeyboard } = bp;
    const footerBaseHeight = width < 640 ? 56 : 64;
    const topSafePad = 12;
    const availableHeight = Math.max(260, height - footerBaseHeight - topSafePad);
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const budgetScale = clamp(availableHeight / 760, 0.68, 1);
    const hScale = clamp(availableHeight / 760, 0.4, 1);
    const wScale = clamp(width / 1180, 0.45, 1);
    const scale = Math.min(hScale, wScale);

    type LayoutMode = 'micro' | 'phone' | 'compact' | 'short' | 'default';
    const layoutMode: LayoutMode =
      width < 360 || availableHeight < 340 ? 'micro' :
      width < 430 ? 'phone' :
      width <= 750 ? 'compact' :
      availableHeight < 500 ? 'short' :
      'default';

    const isNarrowPhone = width < 430;
    const isShortViewport = availableHeight < 500;
    const stackedButtonsLayout = width < 760;
    const useHorizontalLayout = availableHeight < 330 && width > 620;
    const stackedVerticalFit = stackedButtonsLayout ? clamp(availableHeight / 940, 0.8, 1) : 1;

    const portraitHeight = Math.floor(Math.min(210, availableHeight * 0.29 * stackedVerticalFit, width * 0.36));
    const portraitSize = {
      h: Math.max(76, portraitHeight),
      w: Math.floor((Math.max(76, portraitHeight) * 176) / 224),
    };
    const squareSize = Math.floor(Math.min(138, Math.max(72, availableHeight * 0.24), width * 0.26));
    const showPortrait = !useHorizontalLayout && width >= 360 && (stackedButtonsLayout ? availableHeight >= 660 : availableHeight >= 520);

    const containerPadding = {
      x: Math.max(8, Math.floor(28 * scale)),
      y: Math.max(4, Math.min(Math.floor(22 * scale * budgetScale), Math.floor(availableHeight * 0.065))),
    };
    const profileMarginBottom = Math.max(2, Math.floor(14 * hScale * stackedVerticalFit * budgetScale));
    const titleSize = Math.max(0.6, 1.58 * scale * stackedVerticalFit * budgetScale);
    const descSize = Math.max(0.58, 0.9 * scale * budgetScale);

    const buttonProfile = {
      micro: { pad: 'px-4 py-1.5', label: 'text-[11px]', icon: 'w-3 h-3', stackMax: Math.min(304, width * 0.76), minWidth: 0, estimate: 162, gap: 6 },
      phone: { pad: 'px-5 py-2', label: 'text-xs', icon: 'w-3.5 h-3.5', stackMax: Math.min(316, width * 0.78), minWidth: 0, estimate: 170, gap: 6 },
      compact: { pad: 'px-6 py-2', label: 'text-sm', icon: 'w-4 h-4', stackMax: Math.min(328, width * 0.72), minWidth: clamp(Math.floor(width * 0.14), 150, 176), estimate: 168, gap: 7 },
      short: { pad: 'px-7 py-2.5', label: 'text-base', icon: 'w-4.5 h-4.5', stackMax: Math.min(350, width * 0.8), minWidth: clamp(Math.floor(width * 0.15), 158, 186), estimate: 182, gap: 8 },
      default: { pad: 'px-8 py-3', label: 'text-base', icon: 'w-4.5 h-4.5', stackMax: Math.min(364, width * 0.82), minWidth: clamp(Math.floor(width * 0.16), 160, 192), estimate: 190, gap: 8 },
    }[layoutMode];

    const buttonGap = Math.max(6, Math.floor(buttonProfile.gap * budgetScale));
    const buttonStackMaxWidth = Math.floor(buttonProfile.stackMax);
    const buttonMinWidth = isNarrowPhone ? 0 : buttonProfile.minWidth;

    const estimatedTotalRowWidth = Math.max(buttonMinWidth, buttonProfile.estimate) * 3 + buttonGap * 2;
    // Go side-by-side whenever the three buttons physically fit; no arbitrary width floor.
    const buttonsHorizontal =
      !isNarrowPhone &&
      availableHeight >= 260 &&
      estimatedTotalRowWidth <= width * 0.94;

    const menuTopSpacing = Math.max(6, Math.floor(profileMarginBottom * 1.2));
    const menuBottomSpacing = buttonsHorizontal ? Math.max(14, Math.floor(22 * budgetScale)) : Math.max(10, Math.floor(14 * budgetScale));

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
      buttonPadClass: buttonProfile.pad,
      buttonLabelClass: buttonProfile.label,
      buttonIconClass: buttonProfile.icon,
      buttonStackMaxWidth,
      buttonMinWidth,
      titleBoxPadX: layoutMode === 'micro' ? 12 : isShortViewport ? 16 : 22,
      titleBoxPadY: layoutMode === 'micro' ? 5 : isShortViewport ? 6 : 8,
      menuTopSpacing,
      menuBottomSpacing,
      topSafePad,
      bottomSafePad: footerBaseHeight,
      isShortViewport,
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

  const homeButtons = [
    {
      id: 'projects',
      label: 'Projects',
      hint: 'EXPLORE [P]',
      onClick: handleProjectsClick,
      disabled: isNavigatingProjects,
      bg: 'bg-base0D hover:bg-base0C',
      shadow: 'border-base0D translate-x-1 translate-y-1 pointer-fine:group-hover/btn:translate-x-2 pointer-fine:group-hover/btn:translate-y-2',
      clip: '[clip-path:polygon(2%_0,100%_0,96%_100%,0_100%)] hover:[clip-path:polygon(6%_0,96%_0,100%_100%,0_100%)]',
      iconRotate: 'rotate-[4deg]',
      iconPath: 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3',
    },
    {
      id: 'resume',
      label: 'Resume',
      hint: 'DOSSIER [R]',
      onClick: handleResumeClick,
      disabled: false,
      bg: 'bg-base0B hover:bg-base0A',
      shadow: 'border-base0B translate-x-1.5 translate-y-2 pointer-fine:group-hover/btn:translate-x-2.5 pointer-fine:group-hover/btn:translate-y-2.5',
      clip: '[clip-path:polygon(0_0,98%_0,93%_100%,4%_100%)] hover:[clip-path:polygon(4%_0,95%_0,100%_100%,0_100%)]',
      iconRotate: '-rotate-[3deg]',
      iconPath: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    },
    {
      id: 'contact',
      label: 'Contact',
      hint: 'MESSAGE [C]',
      onClick: handleContactClick,
      disabled: false,
      bg: 'bg-base0E hover:bg-base0F',
      shadow: 'border-base0E translate-x-2 translate-y-1.5 pointer-fine:group-hover/btn:translate-x-3 pointer-fine:group-hover/btn:translate-y-2',
      clip: '[clip-path:polygon(4%_0,100%_0,97%_100%,2%_100%)] hover:[clip-path:polygon(8%_0,96%_0,100%_100%,0_100%)]',
      iconRotate: 'rotate-[2deg]',
      iconPath: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
    },
  ];

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
      <main
        className="fixed inset-0 min-h-[100dvh] flex flex-col items-center justify-center bg-base00 overflow-x-hidden touch-none"
        style={{ paddingTop: '12px', paddingBottom: 'calc(56px + var(--safe-bottom))' }}
      />
    );
  }

  return (
    <main
      className="fixed inset-0 min-h-[100dvh] flex flex-col items-center justify-center bg-base00 overflow-x-hidden touch-none"
      style={{
        paddingTop: `${responsiveStyles.topSafePad}px`,
        paddingBottom: `calc(${responsiveStyles.bottomSafePad}px + var(--safe-bottom))`,
      }}
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
          className="relative z-[220] flex flex-col items-center justify-center h-full w-full max-w-4xl max-h-full mx-auto overflow-visible"
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
              className={
                responsiveStyles.useHorizontalLayout
                  ? "flex w-full items-start justify-center gap-6"
                  : "flex flex-col items-center w-fit"
              }
            >
              {/* Profile Image Container - Persona Stylized */}
              <motion.div
                layout
                initial={false}
                animate={{
                  marginBottom: responsiveStyles.useHorizontalLayout ? 0 : 8,
                  marginRight: 0,
                  rotate: responsiveStyles.useHorizontalLayout ? -2 : 0,
                }}
                transition={springTransition}
                className="flex-shrink-0"
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
                    sizes="(max-width: 640px) 42vw, (max-width: 1024px) 30vw, 176px"
                    className={`${responsiveStyles.showPortrait ? 'object-cover object-top' : 'object-cover'} w-full h-full transition-all duration-700 ${profileLoaded ? 'blur-0 opacity-90 scale-100' : 'blur-xl opacity-0 scale-110'}`}
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
                className={responsiveStyles.useHorizontalLayout ? "mt-0 min-w-0 flex-1 max-w-md" : "mt-4 sm:mt-6"}
              >
                <div className="relative inline-block mb-6">
                  {/* Layered Shadows */}
                  <div className="absolute inset-0 bg-base09 -skew-x-12 translate-x-3 translate-y-2 opacity-30" />
                  <div className="absolute inset-0 bg-base08 -skew-x-12 translate-x-1.5 translate-y-1 opacity-50" />
                  
                  {/* Main Title Box */}
                  <div
                    className="relative bg-base00 border-2 border-base05 -skew-x-12 shadow-2xl"
                    style={{ paddingInline: `${responsiveStyles.titleBoxPadX}px`, paddingBlock: `${responsiveStyles.titleBoxPadY}px` }}
                  >
                    <motion.h1
                      initial={false}
                      animate={{ fontSize: `${responsiveStyles.titleSize * (responsiveStyles.isShortViewport ? 1.34 : 1.52)}rem` }}
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
                    className="font-p5-body text-base05 max-w-md font-semibold uppercase not-italic tracking-tight leading-[1.35]"
                  >
                    Computer Science student at
                    <br />
                    <span className="inline-block text-base09 font-bold">Eastern Washington University</span>
                    <br />
                    currently exploring macOS reverse engineering and UI design tweaks.
                  </motion.p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Persona Menu Divider */}
          <motion.div
            initial={false}
            animate={{
              marginTop: responsiveStyles.menuTopSpacing,
              marginBottom: responsiveStyles.menuBottomSpacing,
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
              className="flex justify-center items-center w-full"
              style={{
                gap: responsiveStyles.buttonGap,
                alignItems: 'center',
                flexWrap: responsiveStyles.buttonsHorizontal ? 'wrap' : 'nowrap',
              }}
            >
              {homeButtons.map((button) => (
                <div
                  key={button.id}
                  className={`relative group/btn mx-auto ${responsiveStyles.buttonsHorizontal ? 'w-auto' : 'w-full'}`}
                  style={{ maxWidth: responsiveStyles.buttonsHorizontal ? undefined : responsiveStyles.buttonStackMaxWidth }}
                >
                  <div className={`p6-button-shadow ${button.shadow}`} />
                  <motion.button
                    onClick={button.onClick}
                    className={`relative p6-button ${button.clip} ${responsiveStyles.buttonPadClass} ${button.bg} text-base00 flex items-center justify-center gap-4 disabled:opacity-50 ${responsiveStyles.buttonsHorizontal ? '' : 'w-full'}`}
                    style={{ minWidth: responsiveStyles.buttonsHorizontal ? `${responsiveStyles.buttonMinWidth}px` : undefined }}
                    disabled={button.disabled}
                  >
                    <span className={`skew-x-12 font-black uppercase italic tracking-tighter ${responsiveStyles.buttonLabelClass}`}>
                      {button.label}
                    </span>
                    <div className="relative skew-x-12">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className={`${responsiveStyles.buttonIconClass} ${button.iconRotate}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={button.iconPath} />
                      </svg>
                    </div>
                  </motion.button>
                  {responsiveStyles.hasKeyboard && (
                    <div className="p6-tooltip top-full mt-3 left-1/2 -translate-x-1/2 opacity-0 pointer-fine:group-hover/btn:opacity-100 transition-opacity">
                      <span className="p6-tooltip-text">{button.hint}</span>
                    </div>
                  )}
                </div>
              ))}
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
