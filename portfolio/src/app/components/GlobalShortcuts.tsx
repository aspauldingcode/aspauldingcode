'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

export default function GlobalShortcuts() {
    const router = useRouter();
    const pathname = usePathname();
    const { toggleTheme } = useTheme();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input/textarea is focused or if modifiers are pressed
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return; // Allow Shift for some shortcuts if needed, but 't'/'h' usually don't need it. 
            // User requested "t" and "h", implying lowercase sans modifiers.

            const key = e.key.toLowerCase();

            // Global: t -> Toggle Theme
            if (key === 't') {
                toggleTheme();
            }

            // Global (except home): h -> Home
            if (key === 'h' && pathname !== '/') {
                router.push('/');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pathname, router, toggleTheme]);

    return null;
}
