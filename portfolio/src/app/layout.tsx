import './globals.css';
import ClientLayout from './components/ClientLayout';
import Script from 'next/script';
import Footer from './components/Footer';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY;

export const metadata = {
  title: 'Portfolio',
  description: 'My portfolio website',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  other: {
    'overscroll-behavior': 'none',
  },
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
              const storedTheme = localStorage.getItem('theme');
              if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto') {
                return storedTheme;
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
              return effectiveTheme;
            }
            
            const theme = getTheme();
            applyTheme(theme);
            
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <Script src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}&badge=bottomright&size=invisible`} />
      </head>
      <body>
        <ClientLayout>
          {children}
          <Footer />
        </ClientLayout>
      </body>
    </html>
  );
}
