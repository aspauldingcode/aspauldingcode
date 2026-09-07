import SiteFooter from '@/components/SiteFooter';
import { HIRE_HREF } from '@/lib/hireIntent';
import { resume } from '@/content/resume';

/** Same wrap-width hire + footer as `/`. Show on every project / view pane. */
export default function ProjectFoot() {
  const name = resume.basics.name;
  return (
    <div className="project-foot">
      <p className="project-cta">
        <a className="hire-me" href={HIRE_HREF}>
          Hire me
        </a>
      </p>
      <p className="project-home">
        <a href="/">← Back to {name}</a>
      </p>
      <SiteFooter />
    </div>
  );
}
