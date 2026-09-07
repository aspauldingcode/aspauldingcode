import { resume } from '@/content/resume';

const year = new Date().getFullYear();
const name = resume.basics.name;
const SOURCE_HREF = 'https://github.com/aspauldingcode/aspauldingcode';

export default function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={className ? `footer ${className}` : 'footer'}>
      <hr className="footer-rule" aria-hidden="true" />
      <p>
        © {year > 2023 ? `2023-${year}` : '2023'} {name} /{' '}
        <a href={SOURCE_HREF} target="_blank" rel="noopener noreferrer">
          source
        </a>
      </p>
      <p className="footer-stack">Proudly written with TypeScript / Astro</p>
    </footer>
  );
}
