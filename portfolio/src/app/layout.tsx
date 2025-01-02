import './globals.css';
import ClientLayout from './components/ClientLayout';
import Script from 'next/script';
import Footer from './components/Footer';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY;

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
        <Script src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`} />
      </head>
      <body>
        <ClientLayout>
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </ClientLayout>
      </body>
    </html>
  );
}
