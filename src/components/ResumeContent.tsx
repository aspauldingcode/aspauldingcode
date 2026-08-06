import DetailCrumb from '@/components/DetailCrumb';
import PrintButton from '@/components/PrintButton';
import Section from '@/components/Section';
import {
  awardsByYear,
  formatYearRange,
  resume,
  yearOf,
} from '@/content/resume';
import { detailTrail } from '@/lib/detailTrail';
import { viewHref } from '@/lib/viewHref';
import Link from 'next/link';

export default function ResumeContent() {
  const { basics } = resume;
  const place = [basics.location?.city, basics.location?.region]
    .filter(Boolean)
    .join(', ');
  const homeLabel = basics.name;

  return (
    <div className="wrap detail-pane resume-page">
      <DetailCrumb items={detailTrail('Links', 'Resume')} />

      <header className="resume-head">
        <h1>{basics.name}</h1>
        {basics.label ? <p className="role">{basics.label}</p> : null}
        <p className="resume-contact">
          {basics.url ? (
            <Link href={viewHref(basics.url)}>
              {basics.url.replace(/^https?:\/\//, '')}
            </Link>
          ) : null}
          {place ? (
            <>
              {basics.url ? ' / ' : null}
              {place}
            </>
          ) : null}
          {(basics.profiles ?? [])
            .filter((p) => p.url)
            .map((p) => (
              <span key={p.network}>
                {' / '}
                <Link href={viewHref(p.url!)}>{p.network}</Link>
              </span>
            ))}
        </p>
        <p className="resume-actions no-print">
          <PrintButton />
          {' / '}
          <Link href="/#contact">Contact form</Link>
        </p>
      </header>

      {basics.summary ? <p className="about resume-summary">{basics.summary}</p> : null}

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

      {resume.projects && resume.projects.length > 0 ? (
        <Section title="Projects">
          <ul className="resume-bullets">
            {resume.projects.map((p) => (
              <li key={p.name}>
                {p.url ? (
                  <Link href={viewHref(p.url)}>
                    <strong>{p.name}</strong>
                  </Link>
                ) : (
                  <strong>{p.name}</strong>
                )}
                {p.description ? ` - ${p.description}` : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

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

      <p className="project-home">
        <Link href="/">← Back to {homeLabel}</Link>
      </p>
    </div>
  );
}
