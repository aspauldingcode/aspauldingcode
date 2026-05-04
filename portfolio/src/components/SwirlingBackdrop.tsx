import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface SwirlingBackdropProps {
    colors: string[];
}

// Validate and normalise a hex colour string.
const parseHexColor = (v: string): string | null => {
    const s = v.trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s;
    if (/^#[0-9a-f]{3}$/i.test(s))
        return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
    return null;
};

// Append two-digit hex alpha to a 6-char hex colour.
const hex = (color: string, alpha: number) =>
    `${color}${Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        .toString(16)
        .padStart(2, '0')}`;

export const SwirlingBackdrop: React.FC<SwirlingBackdropProps> = ({ colors }) => {
    const isInitial = React.useRef(true);

    useEffect(() => {
        if (colors.length > 0 && isInitial.current) {
            const timer = setTimeout(() => { isInitial.current = false; }, 350);
            return () => clearTimeout(timer);
        }
    }, [colors]);

    // Parse and extend the palette to always have 6 usable entries.
    const palette = useMemo(() => {
        const FALLBACK = ['#ab4642', '#dc9656', '#86c1b9', '#ba8baf', '#a1b56c', '#7cafc2'];
        const valid = colors.map(parseHexColor).filter(Boolean) as string[];
        const base = valid.length >= 2 ? valid : FALLBACK;
        return Array.from({ length: 6 }, (_, i) => base[i % base.length]);
    }, [colors]);

    if (colors.length === 0) return null;

    const [c0, c1, c2, c3, c4, c5] = palette;

    // GPU promotion hints — all animation is pure CSS transform/opacity,
    // no SVG filter processing happens in the compositor at all.
    const gpuLayer: React.CSSProperties = {
        backfaceVisibility: 'hidden',
        willChange: 'transform',
    };

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute inset-0 bg-base00 transition-colors duration-1000" />

            {/* Primary colour sweep: palette zone 0-1-2 diagonal */}
            <motion.div
                className="absolute"
                style={{
                    top: '-22%', left: '-22%', right: '-22%', bottom: '-22%',
                    backgroundImage: `linear-gradient(135deg, ${hex(c0, 0.80)} 0%, ${hex(c1, 0.52)} 35%, ${hex(c2, 0.20)} 62%, transparent 100%)`,
                    ...gpuLayer,
                }}
                animate={{ x: ['-6%', '10%', '-8%', '-6%'], y: ['-8%', '7%', '-10%', '-8%'], rotate: [0, 14, -8, 0], scale: [1, 1.12, 0.92, 1] }}
                transition={{ duration: 7.2, ease: 'easeInOut', repeat: Infinity }}
            />

            {/* Secondary sweep: palette zone 3-4, screen blend for light additive mix */}
            <motion.div
                className="absolute mix-blend-screen"
                style={{
                    top: '-22%', left: '-22%', right: '-22%', bottom: '-22%',
                    backgroundImage: `linear-gradient(225deg, ${hex(c3, 0.72)} 0%, ${hex(c4, 0.40)} 48%, transparent 100%)`,
                    ...gpuLayer,
                }}
                animate={{ x: ['8%', '-6%', '6%', '8%'], y: ['6%', '-7%', '8%', '6%'], rotate: [0, -12, 9, 0], scale: [1, 0.94, 1.08, 1] }}
                transition={{ duration: 9.2, ease: 'easeInOut', repeat: Infinity, delay: -1.2 }}
            />

            {/* Stripe accent: zone 5 + zone 0, overlay blend — Persona diagonal cuts */}
            <motion.div
                className="absolute mix-blend-overlay"
                style={{
                    top: '-22%', left: '-22%', right: '-22%', bottom: '-22%',
                    opacity: 0.48,
                    backgroundImage: `repeating-linear-gradient(112deg, ${hex(c5, 0.62)} 0 4px, transparent 4px 12px), repeating-linear-gradient(58deg, ${hex(c0, 0.40)} 0 3px, transparent 3px 10px)`,
                    ...gpuLayer,
                }}
                animate={{ x: ['4%', '-5%', '3%', '4%'], y: ['-4%', '6%', '-5%', '-4%'], rotate: [0, 8, -6, 0], scale: [1, 1.05, 0.95, 1] }}
                transition={{ duration: 10.8, ease: 'easeInOut', repeat: Infinity, delay: -2.4 }}
            />

            {/* Persona fixed accent: P3 cyan + P5 red angular slices */}
            <motion.div
                className="absolute inset-0 mix-blend-screen"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(126deg, rgba(88,178,212,0.36) 0 7px, rgba(0,0,0,0) 7px 22px), repeating-linear-gradient(142deg, rgba(196,44,52,0.30) 0 6px, rgba(0,0,0,0) 6px 21px)',
                }}
                animate={{ opacity: [0.22, 0.34, 0.22] }}
                transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 bg-[linear-gradient(138deg,transparent_6%,rgba(0,0,0,0.26)_68%,rgba(0,0,0,0.4)_100%)]" />
        </div>
    );
};

export default SwirlingBackdrop;
