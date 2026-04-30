'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, PanInfo, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';

interface ResumeViewerProps {
    onCheckClose: () => void;
    cachedResume: string | null;
}

export default function ResumeViewer({ onCheckClose, cachedResume }: ResumeViewerProps) {
    const bp = useBreakpoints();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    const pdfUrl = '/resume_alex_spaulding.pdf';
    const dragY = useMotionValue(0);
    const dragControls = useDragControls(); // Add drag controls
    const backdropOpacity = useTransform(dragY, [0, 300], [0.5, 0]);

    // Create a Blob URL from the cached base64 string for instant loading
    const displayUrl = useMemo(() => {
        const fitParams = '#view=FitH&toolbar=0&navpanes=0';
        
        if (!cachedResume) return `${pdfUrl}${fitParams}`;

        try {
            let base64 = cachedResume;
            // If it's already a data URL (from FileReader), strip the prefix to handle appending params consistently
            if (base64.startsWith('data:application/pdf;base64,')) {
                base64 = base64.replace('data:application/pdf;base64,', '');
            }

            // Return with FitH parameters appended to the data URL
            return `data:application/pdf;base64,${base64}${fitParams}`;
        } catch {
            return `${pdfUrl}${fitParams}`;
        }
    }, [cachedResume]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            e.stopPropagation(); // Stop propagation to global handlers

            const key = e.key.toLowerCase();
            if (key === 'escape') {
                onCheckClose();
            }
            if (key === 'd') {
                handleDownload();
            }
            if (key === 'v') {
                handleOpenNewTab();
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [onCheckClose]);

    const handleOpenNewTab = () => {
        // Use the static URL for external opening to ensure browser native features work best
        window.open(pdfUrl, '_blank');
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'alex_spaulding_resume.pdf';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onCheckClose();
        }
    };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center p-0 sm:p-4 md:p-8 pointer-events-none">
      {/* Backdrop Container - Dossier Style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 pointer-events-auto overflow-hidden"
        onClick={onCheckClose}
      >
        <div className="absolute inset-0 bg-base00/70 backdrop-blur-md" />
        {/* Blue Grid/Blueprint Motif */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{ 
            backgroundImage: `radial-gradient(var(--base0D) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }} 
        />
      </motion.div>

      <motion.div
        initial={{ y: 1000, rotate: -3, scale: 0.95 }}
        animate={{ y: 0, rotate: 0, scale: 1 }}
        exit={{ y: 1000, rotate: 3, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        style={{ y: dragY }}
        onDragEnd={handleDragEnd}
        className="relative w-full sm:max-w-6xl pointer-events-auto flex flex-col h-[95vh] sm:h-[90vh]"
      >
        {/* Dossier Folder Shadows */}
        <div 
          className="absolute inset-0 bg-base0D translate-x-3 translate-y-3 opacity-40"
          style={{ clipPath: 'polygon(0% 5%, 15% 0%, 85% 2%, 100% 7%, 98% 100%, 2% 98%)' }}
        />
        <div 
          className="absolute inset-0 bg-base00 translate-x-1.5 translate-y-1.5"
          style={{ clipPath: 'polygon(2% 7%, 18% 2%, 82% 0%, 98% 5%, 100% 98%, 0% 100%)' }}
        />

        {/* Main Content Area */}
        <div 
          className="relative bg-base01 overflow-hidden flex flex-col h-full"
          style={{ clipPath: 'polygon(0% 5%, 20% 0%, 80% 2%, 100% 8%, 97% 97%, 3% 100%)' }}
        >
          {/* Header - Dossier Tab Style */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="w-full relative bg-base0D py-6 px-8 cursor-grab active:cursor-grabbing shrink-0 touch-none flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden border-b-2 border-base00"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, var(--base00) 25%, transparent 25%, transparent 50%, var(--base00) 50%, var(--base00) 75%, transparent 75%, transparent)' , backgroundSize: '4px 4px'}} />
            
            <div className="relative flex flex-col items-center sm:items-start">
              <div className="bg-base00 px-3 py-1 mb-2 -skew-x-12">
                <span className="text-[10px] font-black text-base0D uppercase tracking-[0.3em] skew-x-12 block">CONFIDANT DATA</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-base00 uppercase italic tracking-tighter leading-none">
                Alex&apos;s Dossier
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="p6-button-shadow" />
                <button
                  onClick={handleDownload}
                  className="p6-button px-6 py-2 bg-base00 text-base0D border-2 border-base0D flex items-center gap-2 group/btn"
                >
                  <svg className="w-5 h-5 skew-x-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span className="text-xs font-black uppercase italic skew-x-12">Download</span>
                </button>
              </div>

              <div className="relative group">
                <div className="p6-button-shadow" />
                <button
                  onClick={onCheckClose}
                  className="p6-button p-2 bg-base08 text-base00"
                >
                  <svg className="w-6 h-6 skew-x-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* PDF Viewer Area */}
          <div className="flex-1 relative bg-base00 flex flex-col overflow-hidden">
             {/* Dynamic Loading Filter */}
            <div className="absolute inset-0 pointer-events-none z-10 bg-base0D/5 mix-blend-overlay" />
            
            <iframe
              src={displayUrl}
              className="w-full h-full border-none filter grayscale-[20%] contrast-[110%]"
              title="Resume Preview"
            />
          </div>

          {/* Footer Bar */}
          <div className="h-12 bg-base0D/10 flex items-center justify-center border-t-2 border-base0D/20">
             <span className="text-[10px] font-black text-base04 tracking-[0.5em] uppercase italic">RECORDS ARCHIVE v6.0</span>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
