import { resume } from '@/content/resume';
import { viewHref } from '@/lib/viewHref';
import Link from 'next/link';

const year = new Date().getFullYear();
const name = resume.basics.name;

export default function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={className ? `footer ${className}` : 'footer'}>
      <hr className="footer-rule" aria-hidden="true" />
      <p>
        © {year > 2023 ? `2023-${year}` : '2023'} {name} /{' '}
        <Link href={viewHref('https://github.com/aspauldingcode/aspauldingcode')}>
          source
        </Link>
      </p>
      <p className="footer-stack">Proudly written with TypeScript / Next.js</p>
    </footer>
  );
}
