import JsonLd from '@/components/JsonLd';
import ResumeContent from '@/components/ResumeContent';
import { resume } from '@/content/resume';
import {
  SITE_NAME,
  absoluteUrl,
  breadcrumbJsonLd,
  personJsonLd,
  siteDescription,
} from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resume',
  description: resume.basics.summary ?? resume.basics.label ?? siteDescription(),
  alternates: { canonical: '/resume' },
  openGraph: {
    type: 'profile',
    url: absoluteUrl('/resume'),
    title: `Resume / ${SITE_NAME}`,
    description: resume.basics.summary ?? resume.basics.label ?? siteDescription(),
    images: [
      {
        url: absoluteUrl('/profile_square.jpg'),
        alt: `${SITE_NAME} portrait photo`,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: `Resume / ${SITE_NAME}`,
    description: resume.basics.summary ?? resume.basics.label ?? siteDescription(),
    images: [
      {
        url: absoluteUrl('/profile_square.jpg'),
        alt: `${SITE_NAME} portrait photo`,
      },
    ],
  },
};

export default function ResumePage() {
  return (
    <>
      <JsonLd
        data={[
          personJsonLd(),
          breadcrumbJsonLd([
            { name: SITE_NAME, path: '/' },
            { name: 'Resume', path: '/resume' },
          ]),
        ]}
      />
      <ResumeContent />
    </>
  );
}
