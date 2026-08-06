import BandPlayer from '@/components/BandPlayer';
import DetailCrumb from '@/components/DetailCrumb';
import ImageCarousel from '@/components/ImageCarousel';
import SectionTitle from '@/components/SectionTitle';
import { getProject, getProjectSlugs } from '@/content/projects';
import { resume } from '@/content/resume';
import { detailTrail } from '@/lib/detailTrail';
import { imageSize } from '@/lib/imageSize';
import { viewHref } from '@/lib/viewHref';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: 'Project' };
  return {
    title: `${project.title} · Alex Spaulding`,
    description: project.blurb,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const homeLabel = resume.basics.name;
  const sizes = project.images.map(
    (src) => imageSize(src) ?? { w: 1600, h: 1200 }
  );

  return (
    <div className="wrap detail-pane">
      <DetailCrumb items={detailTrail('Selected work', project.title)} />

      <article className="project-detail">
        <header>
          <SectionTitle as="h1">{project.title}</SectionTitle>
          <p className="years">{project.years}</p>
        </header>

        <ImageCarousel
          key={project.slug}
          images={project.images}
          alt={project.title}
          sizes={sizes}
        />

        <div
          className="project-body"
          dangerouslySetInnerHTML={{ __html: project.bodyHtml }}
        />

        {project.links.length > 0 ? (
          <ul className="links">
            {project.links.map((link) => (
              <li key={link.href}>
                <Link href={viewHref(link.href)}>{link.label}</Link>
              </li>
            ))}
          </ul>
        ) : null}

        {project.music && project.tracks?.length ? (
          <BandPlayer catalog={project.tracks} />
        ) : null}
      </article>

      <p className="project-home">
        <Link href="/">← Back to {homeLabel}</Link>
      </p>
    </div>
  );
}
