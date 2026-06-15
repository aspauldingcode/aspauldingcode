import Link from 'next/link';
import type { ReactNode } from 'react';

const PROSE_CSS = `
.legal-prose h2 {
  font-family: var(--font-kanit), sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  margin: 2rem 0 0.5rem;
  color: var(--base05);
}
.legal-prose h3 {
  font-weight: 600;
  font-size: 1.05rem;
  margin: 1.25rem 0 0.4rem;
  color: var(--base05);
}
.legal-prose p,
.legal-prose li {
  font-size: 0.975rem;
  line-height: 1.65;
  color: color-mix(in srgb, var(--base05) 88%, var(--base03));
}
.legal-prose p { margin: 0.5rem 0; }
.legal-prose ul { margin: 0.5rem 0 0.5rem 1.25rem; list-style: disc; }
.legal-prose li { margin: 0.3rem 0; }
.legal-prose a { color: var(--base0D, var(--base08)); text-decoration: underline; }
.legal-prose strong { color: var(--base05); font-weight: 600; }
`;

/**
 * Shared chrome for the Whisperer legal documents (Privacy Policy, Terms of Use).
 * Uses the site's base16 theme variables so it matches light/dark automatically. These pages are
 * intentionally simple and self-contained so they render cleanly inside the app's in-app browser
 * (SFSafariViewController on iOS) and stay readable when surfaced natively on watchOS.
 */
export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--base00)',
        color: 'var(--base05)',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PROSE_CSS }} />
      <article
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: 'calc(2rem + env(safe-area-inset-top)) 1.25rem calc(5rem + env(safe-area-inset-bottom))',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: 'color-mix(in srgb, var(--base05) 70%, var(--base03))',
            textDecoration: 'none',
          }}
        >
          ← aspauldingcode.com
        </Link>

        <h1
          style={{
            fontFamily: 'var(--font-kanit), sans-serif',
            fontWeight: 900,
            fontSize: '2rem',
            lineHeight: 1.1,
            margin: '0 0 0.35rem',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: '0.8rem',
            color: 'color-mix(in srgb, var(--base05) 60%, var(--base03))',
            margin: '0 0 1.5rem',
          }}
        >
          Last updated {lastUpdated}
        </p>

        <div className="legal-prose">{children}</div>
      </article>
    </main>
  );
}
