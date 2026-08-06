import SectionTitle from '@/components/SectionTitle';
import { sectionId } from '@/lib/sectionId';
import type { ReactNode } from 'react';

type SectionProps = {
  title: string;
  children: ReactNode;
};

/** Homepage / resume section: title + one rule; aria-labelledby from the same slug. */
export default function Section({ title, children }: SectionProps) {
  return (
    <section className="section" aria-labelledby={sectionId(title)}>
      <div className="section-head">
        <SectionTitle>{title}</SectionTitle>
      </div>
      {children}
    </section>
  );
}
