"use client";

import { useState, useLayoutEffect } from 'react';

// Height breakpoints matching tailwind.config.ts
const HEIGHT_BREAKPOINTS = {
    h280: 280,
    h320: 320,
    h350: 350,
    h400: 400,
    h452: 452,
    h500: 500,
    h550: 550,
    h600: 600,
    tall600: 600,
    tall650: 650,
    tall: 700,
} as const;

// Width breakpoints
const WIDTH_BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    wide: 1200,
} as const;

export interface BreakpointState {
    // Height-based (max-height queries)
    isH280: boolean;
    isH320: boolean;
    isH350: boolean;
    isH400: boolean;
    isH452: boolean;
    isH500: boolean;
    isH550: boolean;
    isH600: boolean;
    // Height-based (min-height queries)
    isTall600: boolean;
    isTall650: boolean;
    isTall: boolean;
    // Width-based
    isSm: boolean;
    isMd: boolean;
    isLg: boolean;
    isXl: boolean;
    isWide: boolean;
    // Combined
    isWideShort: boolean;
    // Keyboard presence
    hasKeyboard: boolean;
    // Raw values
    height: number;
    width: number;
    // Mounted state - true after first client-side render with real window values
    isMounted: boolean;
}

// Helper to compute breakpoint state from dimensions
function computeBreakpointState(height: number, width: number, isMounted: boolean = false): BreakpointState {
    return {
        // max-height queries (true when viewport is at or below threshold)
        isH280: height <= HEIGHT_BREAKPOINTS.h280,
        isH320: height <= HEIGHT_BREAKPOINTS.h320,
        isH350: height <= HEIGHT_BREAKPOINTS.h350,
        isH400: height <= HEIGHT_BREAKPOINTS.h400,
        isH452: height <= HEIGHT_BREAKPOINTS.h452,
        isH500: height <= HEIGHT_BREAKPOINTS.h500,
        isH550: height <= HEIGHT_BREAKPOINTS.h550,
        isH600: height <= HEIGHT_BREAKPOINTS.h600,
        // min-height queries (true when viewport is at or above threshold)
        isTall600: height >= HEIGHT_BREAKPOINTS.tall600,
        isTall650: height >= HEIGHT_BREAKPOINTS.tall650,
        isTall: height >= HEIGHT_BREAKPOINTS.tall,
        // min-width queries
        isSm: width >= WIDTH_BREAKPOINTS.sm,
        isMd: width >= WIDTH_BREAKPOINTS.md,
        isLg: width >= WIDTH_BREAKPOINTS.lg,
        isXl: width >= WIDTH_BREAKPOINTS.xl,
        isWide: width >= WIDTH_BREAKPOINTS.wide,
        // Combined
        isWideShort: width >= WIDTH_BREAKPOINTS.wide && height <= HEIGHT_BREAKPOINTS.h600,
        // Keyboard presence (proxy via hover capability)
        // Only check window if mounted to prevent hydration mismatch
        hasKeyboard: isMounted && typeof window !== 'undefined' ? window.matchMedia('(hover: hover)').matches : false,
        // Raw values for custom calculations
        height,
        width,
        // Mounted state
        isMounted,
    };
}

// Get initial dimensions (SSR-safe)
function getInitialDimensions(): { height: number; width: number } {
    // Always return defaults for initial render to ensure server/client match
    // Real dimensions will be set by useLayoutEffect immediately after
    return { height: 800, width: 1200 };
}

export function useBreakpoints(): BreakpointState {
    // Initialize with SSR-safe dimensions
    const [state, setState] = useState<BreakpointState>(() => {
        const { height, width } = getInitialDimensions();
        return computeBreakpointState(height, width, false);
    });

    // Use useLayoutEffect for synchronous update before paint
    // This ensures we have correct dimensions before the first render is visible
    useLayoutEffect(() => {
        const updateBreakpoints = () => {
            const height = window.innerHeight;
            const width = window.innerWidth;
            setState(computeBreakpointState(height, width, true));
        };

        // Immediately update on mount
        updateBreakpoints();

        // Also update after a RAF to catch any layout shifts
        const rafId = requestAnimationFrame(() => {
            updateBreakpoints();
        });

        // Throttled resize handler for better performance
        let resizeRafId: number;
        const handleResize = () => {
            if (resizeRafId) cancelAnimationFrame(resizeRafId);
            resizeRafId = requestAnimationFrame(updateBreakpoints);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(rafId);
            if (resizeRafId) cancelAnimationFrame(resizeRafId);
        };
    }, []);

    return state;
}

// Helper to calculate responsive values based on height
export function getResponsiveValue<T>(
    height: number,
    breakpointValues: { [key: number]: T; default: T }
): T {
    const sortedBreakpoints = Object.keys(breakpointValues)
        .filter(k => k !== 'default')
        .map(Number)
        .sort((a, b) => a - b);

    for (const bp of sortedBreakpoints) {
        if (height <= bp) {
            return breakpointValues[bp];
        }
    }
    return breakpointValues.default;
}
