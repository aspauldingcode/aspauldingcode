import './globals.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import ClientLayout from './components/ClientLayout';
import { SessionProvider } from './context/SessionContext';
import Script from 'next/script';
import { Barlow_Semi_Condensed, Kanit } from 'next/font/google';

/** Condensed sans for project modal body copy — Persona 5–style UI readability */
const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-p5-body',
});

const kanit = Kanit({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-kanit',
});

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY;

export const runtime = 'nodejs';

export const metadata = {
  title: 'Portfolio',
  description: 'My portfolio website',
  other: {
    'overscroll-behavior': 'none',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'color-scheme': 'light dark',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'overlays-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fefbec' },
    { media: '(prefers-color-scheme: dark)', color: '#181818' },
  ],
};

const THEME_BOOTSTRAP = `
(function() {
  function applyTheme(theme) {
    var effectiveTheme = theme;
    if (theme === 'auto') {
      effectiveTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    document.documentElement.style.colorScheme = effectiveTheme;
    document.documentElement.style.setProperty('--current-theme', effectiveTheme);
    var color = effectiveTheme === 'dark' ? '#181818' : '#fefbec';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'theme-color'); document.head.appendChild(meta); }
    meta.setAttribute('content', color);
  }
  var theme = 'auto';
  try { theme = localStorage.getItem('theme') || 'auto'; } catch(e) {}
  applyTheme(theme);
  if (theme === 'auto') {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var cb = function() { applyTheme('auto'); };
    mq.addEventListener ? mq.addEventListener('change', cb) : (mq.addListener && mq.addListener(cb));
  }
  var style = document.createElement('style');
  style.textContent = '.theme-toggle-placeholder { position: fixed; top: calc(1.5rem + env(safe-area-inset-top)); right: calc(1.5rem + env(safe-area-inset-right)); padding: 0.75rem; border-radius: 0.5rem; background-color: var(--base08); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 30; width: 48px; height: 48px; opacity: 0; transition: opacity 300ms; } .footer-placeholder { position: fixed; bottom: 0; left: 0; width: 100%; padding-top: 0.5rem; padding-bottom: calc(0.5rem + env(safe-area-inset-bottom)); text-align: center; font-size: 0.75rem; background-color: rgba(var(--base00-rgb), 0.8); backdrop-filter: blur(4px); z-index: 10; border-top: 1px solid var(--base02); opacity: 0; transition: opacity 300ms; } @media (min-width: 640px) { .theme-toggle-placeholder { top: calc(2rem + env(safe-area-inset-top)); right: calc(2rem + env(safe-area-inset-right)); } } @media (min-width: 1024px) { .theme-toggle-placeholder { top: calc(2.5rem + env(safe-area-inset-top)); right: calc(2.5rem + env(safe-area-inset-right)); } }';
  document.head.appendChild(style);
})();
`;

const GUARD_SCRIPT = `
(function() {
  if (typeof window !== 'undefined' && !window.ethereum) {
    try {
      window.ethereum = new Proxy({}, {
        get: function(t, p) { return undefined; },
        set: function() { return true; }
      });
    } catch (e) {}
  }
  function isIgnored(msg) {
    if (!msg) return false;
    var m = msg.toLowerCase();
    return m.indexOf('window.ethereum') !== -1 || m.indexOf('selectedaddress') !== -1;
  }
  var err = console.error;
  console.error = function() {
    var m = Array.from(arguments).join(' ');
    if (isIgnored(m)) return;
    err.apply(console, arguments);
  };
  window.addEventListener('error', function(e) {
    if (isIgnored(e.message || '')) { e.preventDefault(); e.stopPropagation(); return false; }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    var m = (e.reason && e.reason.message) || '';
    if (isIgnored(m)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${kanit.variable} ${barlowSemiCondensed.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: GUARD_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <Script src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}&badge=bottomright&size=invisible`} />
      </head>
      <body className={kanit.className}>
        <SessionProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
