import { sectionId } from '@/lib/sectionId';
import type { CSSProperties, ReactNode } from 'react';

type SectionTitleProps = {
  children?: ReactNode;
  /** Prefer this when the parent is an Astro template (slots are not always strings). */
  label?: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  style?: CSSProperties;
};

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

/** Title with a hash link; id always matches the visible label. */
export default function SectionTitle({
  children,
  label,
  as: Tag = 'h2',
  className,
  style,
}: SectionTitleProps) {
  const text = label ?? textOf(children);
  const id = sectionId(text);
  return (
    <Tag id={id} className={className} style={style}>
      <a href={`#${id}`} className="section-anchor">
        {children ?? label}
      </a>
    </Tag>
  );
}
