import './globals.css';
import JsonLd from '@/components/JsonLd';
import {
  personJsonLd,
  profilePageJsonLd,
  rootMetadata,
  websiteJsonLd,
} from '@/lib/seo';
import { IBM_Plex_Sans } from 'next/font/google';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

export const runtime = 'nodejs';

export const metadata = rootMetadata();

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
      <body className={plex.className}>
        <JsonLd data={[personJsonLd(), websiteJsonLd(), profilePageJsonLd()]} />
        {children}
      </body>
    </html>
  );
}
