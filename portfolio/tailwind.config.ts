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
    },
  },
  plugins: [],
};
export default config;
