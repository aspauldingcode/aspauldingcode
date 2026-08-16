import ContributionGraphPanel from '@/components/ContributionGraphPanel';
import ContactForm from '@/components/ContactForm';
import GitHubStats from '@/components/GitHubStats';
import HireMe from '@/components/HireMe';
import PrefetchViewLink from '@/components/PrefetchViewLink';
import PrintButton from '@/components/PrintButton';
import Section from '@/components/Section';
import SiteFooter from '@/components/SiteFooter';
import { getProject } from '@/content/projects';
import {
  awardsByYear,
  alsoSeeSlugs,
  formatYearRange,
  resume,
  resumeSelectedWork,
  yearOf,
} from '@/content/resume';
import { formatProjectStars } from '@/lib/projectStars';
import { projectImageAlt } from '@/lib/seo';
import { viewHref } from '@/lib/viewHref';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY;

const { basics } = resume;
// Never render basics.email / basics.phone on this page (contact form only).
const selectedWork = resumeSelectedWork();
const galleryWork = selectedWork.filter((w) => w.kind === 'gallery');
const alsoProjects = selectedWork.filter((w) => w.kind === 'text');
const alsoSee = alsoSeeSlugs()
  .map((slug) => getProject(slug))
  .filter((p): p is NonNullable<typeof p> => Boolean(p));
const githubProfile =
  (basics.profiles ?? []).find((p) => p.network?.toLowerCase() === 'github')?.url ||
  'https://github.com/aspauldingcode';

export default function HomeContent() {
  return (
    <div className="wrap">
      <header className="hero">
        <Image
          className="avatar"
          src="/profile_square.jpg"
          alt={`${basics.name}, square portrait photograph`}
          width={112}
          height={112}
          priority
          sizes="112px"
        />
        <div className="hero-text">
          <div className="hero-name">
            <h1 className="hero-title">{basics.name}</h1>
            <HireMe />
          </div>
          {basics.label ? <p className="role">{basics.label}</p> : null}
          {basics.summary ? <p className="about">{basics.summary}</p> : null}
          <p className="hero-actions">
            <PrintButton />
          </p>
        </div>
      </header>

      {resume.education && resume.education.length > 0 ? (
        <Section title="Education">
          <ul className="resume-list">
            {resume.education.map((ed) => {
              const line = [ed.studyType, ed.area].filter(Boolean).join(', ');
              const when = formatYearRange(ed.startDate, ed.endDate);
              return (
                <li key={`${ed.institution}-${ed.startDate}`} className="resume-entry">
                  <h3>
                    {ed.url ? (
                      <Link href={viewHref(ed.url)}>{ed.institution}</Link>
                    ) : (
                      ed.institution
                    )}
                  </h3>
                  {when ? <p className="when">{when}</p> : null}
                  {line ? <p className="resume-meta">{line}</p> : null}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {resume.work && resume.work.length > 0 ? (
        <Section title="Experience">
          <ul className="resume-list">
            {resume.work.map((job) => {
              const title = [job.position, job.name].filter(Boolean).join(', ');
              const when = formatYearRange(job.startDate, job.endDate);
              return (
                <li key={`${job.name}-${job.startDate}`} className="resume-entry">
                  <h3>
                    {job.url ? (
                      <Link href={viewHref(job.url)}>{title}</Link>
                    ) : (
                      title
                    )}
                  </h3>
                  {when ? <p className="when">{when}</p> : null}
                  {job.highlights && job.highlights.length > 0 ? (
                    <ul className="resume-bullets">
                      {job.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section title="Selected work">
        <ul className="projects">
          {galleryWork.map((entry) => {
            const project = getProject(entry.slug);
            if (!project) return null;
            const years =
              project.years ||
              formatYearRange(entry.resume.startDate, entry.resume.endDate || undefined);
            const blurb = project.blurb || entry.resume.description || '';
            const starLabel = formatProjectStars([
              ...project.links.map((link) => link.href),
              entry.resume.url,
            ]);
            return (
              <li key={project.slug} className="project-row" data-slug={project.slug}>
                <Link href={`/work/${project.slug}`} className="project-thumb-link">
                  <Image
                    src={project.images[0]}
                    alt={projectImageAlt(project, 0)}
                    width={116}
                    height={87}
                    sizes="116px"
                    className="project-thumb"
                  />
                </Link>
                <div>
                  <h3>
                    <Link href={`/work/${project.slug}`}>{project.title}</Link>
                  </h3>
                  {years ? <p className="years">{years}</p> : null}
                  {starLabel ? <p className="project-stars">{starLabel}</p> : null}
                  {blurb ? <p className="blurb">{blurb}</p> : null}
                  <p className="more">
                    <Link href={`/work/${project.slug}`}>View project</Link>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {alsoSee.length > 0 || alsoProjects.length > 0 ? (
          <p className="also-projects">
            Also see:{' '}
            {[
              ...alsoSee.map((project) => ({
                key: project.slug,
                node: <Link href={`/work/${project.slug}`}>{project.title}</Link>,
              })),
              ...alsoProjects.map((entry) => ({
                key: entry.resume.name,
                node: entry.resume.url ? (
                  <Link href={viewHref(entry.resume.url)}>{entry.resume.name}</Link>
                ) : (
                  <>{entry.resume.name}</>
                ),
              })),
            ].map((item, i) => (
              <span key={item.key}>
                {i > 0 ? ' / ' : null}
                {item.node}
              </span>
            ))}
          </p>
        ) : null}
      </Section>

      {resume.skills && resume.skills.length > 0 ? (
        <Section title="Skills">
          <div className="resume-skills">
            {resume.skills.map((skill) => {
              const words = (skill.keywords ?? []).join(', ');
              if (!words) return null;
              return (
                <p key={skill.name ?? words}>
                  {skill.name ? <strong>{skill.name}: </strong> : null}
                  {words}
                </p>
              );
            })}
          </div>
        </Section>
      ) : null}

      {resume.awards && resume.awards.length > 0 ? (
        <Section title="Awards">
          <ul className="resume-bullets">
            {awardsByYear().map((award) => {
              const bits = [award.title, award.awarder].filter(Boolean).join(' / ');
              const y = yearOf(award.date);
              const line = `${bits}${y ? ` (${y})` : ''}`;
              return (
                <li key={`${award.title}-${award.date}`}>
                  {award.url ? (
                    <a href={award.url} target="_blank" rel="noopener noreferrer">
                      {line}
                    </a>
                  ) : (
                    line
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section title="GitHub">
        <p className="more github-profile-link">
          <PrefetchViewLink href={githubProfile}>
            {githubProfile.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </PrefetchViewLink>
        </p>

        <ContributionGraphPanel href={viewHref(githubProfile)} />

        <GitHubStats />
      </Section>

      <Section title="Links">
        <ul className="site-links">
          {(basics.profiles ?? []).map((profile) =>
            profile.url ? (
              <li key={profile.network}>
                <PrefetchViewLink href={profile.url}>{profile.network}</PrefetchViewLink>
              </li>
            ) : null
          )}
        </ul>
      </Section>

      <Section title="Contact">
        {SITE_KEY ? (
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
            strategy="afterInteractive"
          />
        ) : null}
        <ContactForm />
      </Section>

      <SiteFooter />
    </div>
  );
}
