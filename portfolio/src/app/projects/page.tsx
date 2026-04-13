import { projects } from './projectData';
import ProjectsClient from './ProjectsClient';

export const revalidate = 2592000; // Revalidate every 30 days

export default async function Projects() {
  // Sort projects by start year (descending) as stable default
  const sortedProjects = [...projects].sort((a, b) => {
    return (b.startYear || 0) - (a.startYear || 0);
  });

  return <ProjectsClient projects={sortedProjects} initialGithubData={{}} />;
}
