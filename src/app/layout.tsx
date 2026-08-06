import './globals.css';
import { IBM_Plex_Sans } from 'next/font/google';
import { resume } from '@/content/resume';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

export const runtime = 'nodejs';

export const metadata = {
  title: `${resume.basics.name} / ${resume.basics.label ?? 'Systems Software'}`,
  description:
    resume.basics.summary ??
    'Systems software engineer building Wayland compositors, macOS and iOS runtime tooling, and Nix-based infrastructure.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f2ec' },
    { media: '(prefers-color-scheme: dark)', color: '#121411' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable} data-scroll-behavior="smooth">
      <body className={plex.className}>{children}</body>
    </html>
  );
}
