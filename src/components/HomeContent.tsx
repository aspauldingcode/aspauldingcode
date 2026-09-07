import ContributionGraphHost from '@/components/ContributionGraphHost';
import ContactForm from '@/components/ContactForm';
import GitHubStats from '@/components/GitHubStats';
import HireMe from '@/components/HireMe';
import PrefetchViewLink from '@/components/PrefetchViewLink';
import PrintButton from '@/components/PrintButton';
import Section from '@/components/Section';
import SiteFooter from '@/components/SiteFooter';
import type { HomeModel } from '@/lib/homeData';

export default function HomeContent({ model }: { model: HomeModel }) {
  return (
    <div className="wrap">
      <header className="hero">
        <img
          className="avatar"
          src="/profile_avatar.jpg"
          alt={`${model.name}, square portrait photograph`}
          width={112}
          height={112}
          decoding="async"
        />
        <div className="hero-text">
          <div className="hero-name">
            <h1 className="hero-title">{model.name}</h1>
            <HireMe />
          </div>
          {model.label ? <p className="role">{model.label}</p> : null}
          {model.summary ? <p className="about">{model.summary}</p> : null}
          <p className="hero-actions">
            <PrintButton />
          </p>
        </div>
      </header>

      {model.hasEducation ? (
        <Section title="Education">
          <ul className="resume-list">
            {model.education.map((ed) => (
              <li key={ed.key} className="resume-entry">
                <h3>
                  {ed.href ? <a href={ed.href}>{ed.institution}</a> : ed.institution}
                </h3>
                {ed.when ? <p className="when">{ed.when}</p> : null}
                {ed.line ? <p className="resume-meta">{ed.line}</p> : null}
                {ed.score ? <p className="resume-meta">GPA {ed.score}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {model.hasExperience ? (
        <Section title="Experience">
          <ul className="resume-list">
            {model.experience.map((job) => (
              <li key={job.key} className="resume-entry">
                <h3>{job.href ? <a href={job.href}>{job.title}</a> : job.title}</h3>
                {job.when ? <p className="when">{job.when}</p> : null}
                {job.highlights.length > 0 ? (
                  <ul className="resume-bullets">
                    {job.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Selected work">
        <ul className="projects">
          {model.galleryWork.map((project) => (
            <li key={project.slug} className="project-row" data-slug={project.slug}>
              <a href={`/work/${project.slug}`} className="project-thumb-link">
                <img
                  src={project.thumb}
                  alt={project.thumbAlt}
                  width={116}
                  height={87}
                  className="project-thumb"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <div>
                <h3>
                  <a href={`/work/${project.slug}`}>{project.title}</a>
                </h3>
                {project.years ? <p className="years">{project.years}</p> : null}
                {project.starLabel ? <p className="project-stars">{project.starLabel}</p> : null}
                {project.blurb ? <p className="blurb">{project.blurb}</p> : null}
                <p className="more">
                  <a href={`/work/${project.slug}`}>View project</a>
                </p>
              </div>
            </li>
          ))}
        </ul>
        {model.alsoLinks.length > 0 ? (
          <p className="also-projects">
            Also see:{' '}
            {model.alsoLinks.map((item, i) => (
              <span key={item.key}>
                {i > 0 ? ' / ' : null}
                {item.href ? <a href={item.href}>{item.label}</a> : item.label}
              </span>
            ))}
          </p>
        ) : null}
      </Section>

      {model.hasSkills ? (
        <Section title="Skills">
          <div className="resume-skills">
            {model.skills.map((skill) => (
              <p key={skill.key}>
                {skill.name ? <strong>{skill.name}: </strong> : null}
                {skill.words}
              </p>
            ))}
          </div>
        </Section>
      ) : null}

      {model.hasAwards ? (
        <Section title="Awards">
          <ul className="resume-bullets">
            {model.awards.map((award) => (
              <li key={award.key}>
                {award.href ? (
                  <a href={award.href} target="_blank" rel="noopener noreferrer">
                    {award.line}
                  </a>
                ) : (
                  award.line
                )}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="GitHub">
        <p className="more github-profile-link">
          <PrefetchViewLink href={model.githubProfile}>
            {model.githubProfileLabel}
          </PrefetchViewLink>
        </p>
        <ContributionGraphHost href={model.githubViewHref} />
        <GitHubStats />
      </Section>

      <Section title="Links">
        <ul className="site-links">
          {model.profiles.map((profile) => (
            <li key={profile.network}>
              <PrefetchViewLink href={profile.url}>{profile.network}</PrefetchViewLink>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Contact">
        <ContactForm />
      </Section>

      <SiteFooter />
    </div>
  );
}
