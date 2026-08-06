import ContactForm from '@/components/ContactForm';
import GitHubStats from '@/components/GitHubStats';
import PrefetchViewLink from '@/components/PrefetchViewLink';
import Section from '@/components/Section';
import { projects } from '@/content/projects';
import {
  awardsByYear,
  formatYearRange,
  resume,
  resumeOnlyProjects,
  yearOf,
} from '@/content/resume';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { viewHref } from '@/lib/viewHref';
import { projectImageAlt } from '@/lib/seo';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY;

const year = new Date().getFullYear();
const { basics } = resume;
const alsoProjects = resumeOnlyProjects();
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
          alt={`${basics.name} — square portrait photograph`}
          width={112}
          height={112}
          priority
          sizes="112px"
        />
        <div className="hero-text">
          <h1>{basics.name}</h1>
          {basics.label ? <p className="role">{basics.label}</p> : null}
          {basics.summary ? <p className="about">{basics.summary}</p> : null}
        </div>
      </header>

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
          {projects.map((project) => (
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
                <p className="years">{project.years}</p>
                <p className="blurb">{project.blurb}</p>
                <p className="more">
                  <Link href={`/work/${project.slug}`}>View project</Link>
                </p>
              </div>
            </li>
          ))}
        </ul>
        {alsoProjects.length > 0 ? (
          <p className="also-projects">
            Also:{' '}
            {alsoProjects.map((p, i) => (
              <span key={p.name}>
                {i > 0 ? ' / ' : null}
                {p.url ? (
                  <Link href={viewHref(p.url)}>{p.name}</Link>
                ) : (
                  p.name
                )}
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

      {resume.awards && resume.awards.length > 0 ? (
        <Section title="Awards">
          <ul className="resume-bullets">
            {awardsByYear().map((award) => {
              const bits = [award.title, award.awarder].filter(Boolean).join(' / ');
              const y = yearOf(award.date);
              return (
                <li key={`${award.title}-${award.date}`}>
                  {bits}
                  {y ? ` (${y})` : ''}
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

        <div className="github-graph-scroller">
          <Link className="github-graph-link" href={viewHref(githubProfile)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="github-graph"
              src="/github/contributions.svg?v=2023-present"
              alt="GitHub contribution graphs by year, newest at top, from present back to 2023"
              width={804}
              height={664}
            />
          </Link>
        </div>

        <GitHubStats />
      </Section>

      <Section title="Links">
        <ul className="site-links">
          <li>
            <Link href="/resume">Resume</Link>
          </li>
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

      <footer className="footer">
        <hr className="footer-rule" aria-hidden="true" />
        <p>
          © {year > 2023 ? `2023-${year}` : '2023'} {basics.name} /{' '}
          <Link href={viewHref('https://github.com/aspauldingcode/aspauldingcode')}>
            source
          </Link>
        </p>
      </footer>
    </div>
  );
}
