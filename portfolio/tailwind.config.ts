import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base00: 'var(--base00)',
        base01: 'var(--base01)',
        base02: 'var(--base02)',
        base03: 'var(--base03)',
        base04: 'var(--base04)',
        base05: 'var(--base05)',
        base06: 'var(--base06)',
        base07: 'var(--base07)',
        base08: 'var(--base08)',
        base09: 'var(--base09)',
        base0A: 'var(--base0A)',
        base0B: 'var(--base0B)',
        base0C: 'var(--base0C)',
        base0D: 'var(--base0D)',
        base0E: 'var(--base0E)',
        base0F: 'var(--base0F)',
      },
      screens: {
        'h-600': { 'raw': '(max-height: 600px)' },
        'h-550': { 'raw': '(max-height: 550px)' },
        'h-500': { 'raw': '(max-height: 500px)' },
        'h-452': { 'raw': '(max-height: 452px)' },
        'h-400': { 'raw': '(max-height: 400px)' },
        'h-350': { 'raw': '(max-height: 350px)' },
        'h-320': { 'raw': '(max-height: 320px)' },
        'h-280': { 'raw': '(max-height: 280px)' },
        'portrait': { 'raw': '(orientation: portrait)' },
        'landscape': { 'raw': '(orientation: landscape)' },
        'tall': { 'raw': '(min-height: 700px)' },
        'tall-650': { 'raw': '(min-height: 650px)' },
        'tall-600': { 'raw': '(min-height: 600px)' },
        'wide': { 'raw': '(min-width: 1200px)' },
        'w-768': { 'raw': '(max-width: 768px)' },
        'ample-space': { 'raw': '(min-width: 1200px) and (min-height: 700px)' },
        'portrait-tall': { 'raw': '(orientation: portrait) and (min-height: 650px)' },
        'wide-short': { 'raw': '(min-width: 1200px) and (max-height: 600px)' },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: any }) {
      addUtilities({
        ".pt-safe": { paddingTop: "env(safe-area-inset-top)" },
        ".pb-safe": { paddingBottom: "env(safe-area-inset-bottom)" },
        ".pl-safe": { paddingLeft: "env(safe-area-inset-left)" },
        ".pr-safe": { paddingRight: "env(safe-area-inset-right)" },
        ".top-safe": { top: "env(safe-area-inset-top)" },
        ".bottom-safe": { bottom: "env(safe-area-inset-bottom)" },
        ".left-safe": { left: "env(safe-area-inset-left)" },
        ".right-safe": { right: "env(safe-area-inset-right)" },
      });
    },
  ],
};
export default config;
