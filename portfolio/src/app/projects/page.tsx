import { projects } from './projectData';
import ProjectsClient from './ProjectsClient';
import { fetchGitHubDataServer } from '@/lib/github';

export const revalidate = 2592000; // Revalidate every 30 days

export default async function Projects() {
  // Sort projects by start year (descending) as stable default
  const sortedProjects = [...projects].sort((a, b) => {
    return (b.startYear || 0) - (a.startYear || 0);
  });

  // Pre-fetch GitHub data on server
  const repos = sortedProjects
    .filter(p => p.githubRepo)
    .map(p => p.githubRepo!);

  const initialGithubData = repos.length > 0
    ? await fetchGitHubDataServer(repos)
    : {};

  return <ProjectsClient projects={sortedProjects} initialGithubData={initialGithubData} />;
}
