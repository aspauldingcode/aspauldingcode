import './globals.css';
import ClientLayout from './components/ClientLayout';
import { emailConfig } from '@/config/email';
import Script from 'next/script';

export const metadata = {
  title: 'Portfolio',
  description: 'My portfolio website',
};

function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function getTheme() {
              const storedTheme = localStorage.getItem('theme');
              if (storedTheme) {
                return storedTheme;
              }
              return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            const theme = getTheme();
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            }
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
        <Script
          src="https://www.google.com/recaptcha/api.js"
          strategy="beforeInteractive"
        />
        <Script id="recaptcha-load">
          {`
            window.onload = function() {
              grecaptcha.ready(function() {
                grecaptcha.execute('${emailConfig.recaptchaSiteKey}', {action: 'homepage'}).then(function(token) {
                  console.log('reCAPTCHA initialized successfully');
                });
              });
            }
          `}
        </Script>
      </head>
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
