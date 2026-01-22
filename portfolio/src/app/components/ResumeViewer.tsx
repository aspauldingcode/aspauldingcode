'use client';

import { useEffect, useMemo } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, useDragControls } from 'framer-motion';

interface ResumeViewerProps {
    onCheckClose: () => void;
    cachedResume: string | null;
}

export default function ResumeViewer({ onCheckClose, cachedResume }: ResumeViewerProps) {
    const pdfUrl = '/resume_alex_spaulding.pdf';
    const dragY = useMotionValue(0);
    const dragControls = useDragControls(); // Add drag controls
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

            const key = e.key.toLowerCase();
            if (key === 'escape') {
                onCheckClose();
            }
            if (key === 'd') {
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

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onCheckClose();
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
                onClick={onCheckClose}
            >
                {/* Real-time Backdrop - Syncs with dragY */}
                <motion.div
                    style={{ opacity: backdropOpacity }}
                    className="absolute top-0 left-0 right-0 bottom-7 sm:bottom-9 bg-black/50 backdrop-blur-sm"
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
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 1 }}
                    style={{ y: dragY }}
                    onDragEnd={handleDragEnd}
                    className="relative w-full sm:max-w-5xl bg-base01 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] pointer-events-auto"
                >
                    {/* Draggable Header Area */}
                    <div
                        onPointerDown={(e) => dragControls.start(e)}
                        className="w-full relative pt-2 pb-4 cursor-grab active:cursor-grabbing shrink-0 touch-none px-4"
                    >
                        {/* Drag Handle Indicator */}
                        <div className="flex items-center justify-center mb-6">
                            <div className="w-12 h-1.5 bg-base03 rounded-full opacity-50" />
                        </div>

                        {/* Header UI Row: Title and Action Buttons */}
                        <div className="flex items-center justify-between relative">
                            {/* Download/View Button */}
                            <div className="flex flex-col items-center">
                                <motion.button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenNewTab();
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-4 py-2 rounded-lg bg-base0D hover:bg-base0C text-base00 text-sm transition-colors flex items-center gap-2 shadow-sm touch-manipulation"
                                    style={{
                                        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
                                    }}
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
                                <span className="text-[10px] font-mono opacity-50 text-base04 mt-1 pointer-events-none whitespace-nowrap bg-base01/50 px-1 rounded">
                                    (d)
                                </span>
                            </div>

                            {/* Title - Center Aligned */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                                <h2 className="text-xl font-bold text-base05 whitespace-nowrap">Alex&apos;s Resume</h2>
                            </div>

                            {/* Close Button */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCheckClose();
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full text-base05 transition-all duration-200 shadow-sm touch-manipulation"
                                    title="Close (esc)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <span className="text-[10px] font-mono opacity-50 text-base04 mt-1 pointer-events-none whitespace-nowrap bg-base01/50 px-1 rounded">
                                    (esc)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-base01 w-full h-full min-h-[400px] border-t border-base02">
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
