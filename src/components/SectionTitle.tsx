import { sectionId } from '@/lib/sectionId';
import type { CSSProperties } from 'react';

type SectionTitleProps = {
  children: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  style?: CSSProperties;
};

/** Title with a hash link; id always matches the visible label. */
export default function SectionTitle({
  children,
  as: Tag = 'h2',
  className,
  style,
}: SectionTitleProps) {
  const id = sectionId(children);
  return (
    <Tag id={id} className={className} style={style}>
      <a href={`#${id}`} className="section-anchor">
        {children}
      </a>
    </Tag>
  );
}
