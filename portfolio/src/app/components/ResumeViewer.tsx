'use client';

import { useEffect, useMemo } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

interface ResumeViewerProps {
    onCheckClose: () => void;
    cachedResume: string | null;
}

export default function ResumeViewer({ onCheckClose, cachedResume }: ResumeViewerProps) {
    const pdfUrl = '/resume_alex_spaulding.pdf';
    const dragY = useMotionValue(0);
    const backdropOpacity = useTransform(dragY, [0, 300], [0.5, 0]);

    // Create a Blob URL from the cached base64 string for instant loading
    const displayUrl = useMemo(() => {
        if (!cachedResume) return `${pdfUrl}#view=FitH`;

        try {
            // If it's already a data URL (from FileReader), return it
            if (cachedResume.startsWith('data:')) return cachedResume;

            // Otherwise, assume it's raw base64 and wrap it
            return `data:application/pdf;base64,${cachedResume}`;
        } catch {
            return `${pdfUrl}#view=FitH`;
        }
    }, [cachedResume]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            e.stopPropagation(); // Stop propagation to global handlers

            if (e.key === 'Escape') {
                onCheckClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [onCheckClose]);

    const handleOpenNewTab = () => {
        // Use the static URL for external opening to ensure browser native features work best
        window.open(pdfUrl, '_blank');
    };

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onCheckClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center pointer-events-none">
            {/* Backdrop Container - Handles entry/exit animation */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-auto"
                onClick={onCheckClose}
            >
                {/* Real-time Backdrop - Syncs with dragY */}
                <motion.div
                    style={{ opacity: backdropOpacity }}
                    className="absolute inset-0 bg-black"
                />
            </motion.div>

            {/* Content Container */}
            <div className="relative z-10 pointer-events-none w-full h-full sm:h-auto flex items-end justify-center sm:items-center p-0 sm:p-10">
                <motion.div
                    initial={{ y: 1000 }}
                    animate={{ y: 0 }}
                    exit={{ y: 1000 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.5 }}
                    style={{ y: dragY }}
                    onDragEnd={handleDragEnd}
                    className="relative w-full sm:max-w-5xl bg-base01 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] pointer-events-auto"
                >
                    {/* Drag Handle */}
                    <div className="w-full h-8 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 mt-2">
                        <div className="w-12 h-1.5 bg-base03 rounded-full opacity-50" />
                    </div>

                    {/* Close Button - Matches Contact Card */}
                    <button
                        onClick={onCheckClose}
                        className="absolute top-4 right-4 p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full text-base05 transition-all duration-200 z-20 touch-manipulation"
                        style={{
                            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
                        }}
                        title="Close (Esc)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Header: Unified Resume Action */}
                    <div className="flex items-center justify-start p-4 border-b border-base02 bg-base01 pr-16">
                        <motion.button
                            onClick={handleOpenNewTab}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-1.5 rounded-lg bg-base0D hover:bg-base0C text-base00 text-sm font-bold transition-colors flex items-center gap-2 shadow-lg touch-manipulation"
                        >
                            <span>Resume</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                                className="w-4 h-4"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                />
                            </svg>
                        </motion.button>
                    </div>
                    <div className="flex-1 bg-base01 w-full h-full min-h-[500px]">
                        <iframe
                            src={displayUrl}
                            className="w-full h-full border-none"
                            title="Resume Preview"
                        />
                    </div>

                    {/* Bottom padding for website footer */}
                    <div className="h-10 sm:h-6 bg-base01 shrink-0" />
                </motion.div>
            </div>
        </div>
    );
}
