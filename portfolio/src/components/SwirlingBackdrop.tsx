import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SwirlingBackdropProps {
    colors: string[];
}

export const SwirlingBackdrop: React.FC<SwirlingBackdropProps> = ({ colors }) => {
    // We want to render a few blobs with the extracted colors.
    // If no colors are extracted yet, we can default to base00/base01 or transparent.

    // Create a deterministic set of blobs based on the colors available.
    // We'll duplicate colors if we have few, or pick the first few if we have many.

    // We need to track if this is the first load of colors to skip transition
    const isInitial = React.useRef(true);

    useEffect(() => {
        if (colors.length > 0 && isInitial.current) {
            // giving a small timeout to allow first paint instant apply then switch to smooth
            const timer = setTimeout(() => {
                isInitial.current = false;
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [colors]);

    if (colors.length === 0) return null;

    // Ensure we have enough colors for a rich effect
    const palette = [...colors, ...colors, ...colors].slice(0, 6);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Background Base */}
            <div className="absolute inset-0 bg-base00 transition-colors duration-1000" />

            {/* Swirling Blobs */}
            <div className="absolute inset-0 opacity-60 filter blur-[80px] sm:blur-[120px]">
                {palette.map((color, i) => (
                    <Blob key={i} color={color} index={i} total={palette.length} isInitial={isInitial.current} />
                ))}
            </div>

            {/* Overlay to ensure text contrast if needed, or just standard base texture */}
            <div className="absolute inset-0 bg-black/20" />
        </div>
    );
};

const Blob = ({ color, index, total, isInitial }: { color: string; index: number; total: number; isInitial: boolean }) => {
    // Generate random-ish but deterministic positions based on index
    // actually, let's just make them move around.

    const randomDuration = 15 + index * 2;
    const delay = index * -5;

    return (
        <motion.div
            className="absolute rounded-full mix-blend-screen"
            style={{
                width: '60%',
                height: '60%',
                left: `${(index / total) * 60}%`,
                top: `${(index % 2) * 40}%`,
            }}
            animate={{
                x: ['0%', '20%', '-20%', '0%'],
                y: ['0%', '-30%', '20%', '0%'],
                scale: [1, 1.4, 0.8, 1],
                rotate: [0, 180, 360],
                backgroundColor: color,
            }}
            transition={{
                default: {
                    duration: randomDuration,
                    ease: "easeInOut",
                    repeat: Infinity,
                    delay: delay,
                },
                backgroundColor: {
                    duration: isInitial ? 0 : 2.5,
                    ease: "easeInOut",
                    repeat: 0,
                    delay: 0,
                },
            }}
        />
    );
};

export default SwirlingBackdrop;
