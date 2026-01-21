import './globals.css';
import ClientLayout from './components/ClientLayout';
import Script from 'next/script';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY;

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fefbec' },
    { media: '(prefers-color-scheme: dark)', color: '#181818' },
  ],
};

function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function getBrowserPreference() {
              if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
              }
              return 'light';
            }
            
            function getTheme() {
              try {
                const storedTheme = localStorage.getItem('theme');
                if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto') {
                  return storedTheme;
                }
              } catch (e) {
                // Handle localStorage access errors
              }
              return 'auto'; // Default to auto mode
            }
            
            function applyTheme(theme) {
              let effectiveTheme;
              if (theme === 'auto') {
                effectiveTheme = getBrowserPreference();
              } else {
                effectiveTheme = theme;
              }
              document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
              document.documentElement.style.colorScheme = effectiveTheme;
              
              // Set CSS custom properties for immediate theme application
              const root = document.documentElement;
              root.style.setProperty('--current-theme', effectiveTheme);
              
              // Update theme-color meta tag for WebKit
              const themeColor = effectiveTheme === 'dark' ? '#181818' : '#fefbec';
              let metaThemeColor = document.querySelector('meta[name="theme-color"]');
              if (!metaThemeColor) {
                metaThemeColor = document.createElement('meta');
                metaThemeColor.setAttribute('name', 'theme-color');
                document.head.appendChild(metaThemeColor);
              }
              metaThemeColor.setAttribute('content', themeColor);
              
              return effectiveTheme;
            }
            
            // Apply theme immediately on load
            const theme = getTheme();
            applyTheme(theme);
            
            // Listen for system theme changes when in auto mode
            if (theme === 'auto') {
              const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
              const handleSystemChange = function() {
                applyTheme('auto');
              };
              
              // Use both modern and legacy event listeners for Safari compatibility
              if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handleSystemChange);
              } else if (mediaQuery.addListener) {
                mediaQuery.addListener(handleSystemChange);
              }
            }
            
            // Pre-render theme toggle and footer to prevent re-rendering
            const style = document.createElement('style');
            style.textContent = \`
              .theme-toggle-placeholder {
                position: fixed;
                top: 1.5rem;
                right: 1.5rem;
                padding: 0.75rem;
                border-radius: 0.5rem;
                background-color: var(--base08);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 30;
                width: 48px;
                height: 48px;
                opacity: 0;
                transition: opacity 300ms;
              }
              
              .footer-placeholder {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                padding: 0.5rem 0;
                text-align: center;
                font-size: 0.75rem;
                background-color: rgba(var(--base00-rgb), 0.8);
                backdrop-filter: blur(4px);
                z-index: 10;
                border-top: 1px solid var(--base02);
                opacity: 0;
                transition: opacity 300ms;
              }
              
              @media (min-width: 640px) {
                .theme-toggle-placeholder {
                  top: 2rem;
                  right: 2rem;
                }
              }
              
              @media (min-width: 1024px) {
                .theme-toggle-placeholder {
                  top: 2.5rem;
                  right: 2.5rem;
                }
              }
            \`;
            document.head.appendChild(style);
          })();
        `,
      }}
    />
  );
}

function GuardScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const ignoreErrors = [
              'window.ethereum',
              'selectedAddress',
              'ethereum.selectedAddress'
            ];
            
            // Handle console errors
            const originalError = console.error;
            console.error = function() {
              const msg = Array.from(arguments).join(' ');
              if (ignoreErrors.some(err => msg.includes(err))) return;
              originalError.apply(console, arguments);
            };

            // Handle runtime exceptions before Next.js overlay
            window.addEventListener('error', function(event) {
              const msg = event.message || '';
              if (ignoreErrors.some(err => msg.includes(err))) {
                event.preventDefault();
                event.stopPropagation();
                return false;
              }
            }, true);

            // Handle unhandled promise rejections
            window.addEventListener('unhandledrejection', function(event) {
              const msg = (event.reason && event.reason.message) || '';
              if (ignoreErrors.some(err => msg.includes(err))) {
                event.preventDefault();
                event.stopPropagation();
              }
            }, true);
          })();
        `,
      }}
    />
  );
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-hidden">
      <head>
        <GuardScript />
        <ThemeScript />
        <Script src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}&badge=bottomright&size=invisible`} />
      </head>
      <body className="overflow-hidden overscroll-none touch-none">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
