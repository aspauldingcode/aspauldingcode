import { projects } from './projectData';
import ProjectsClient from './ProjectsClient';
import { fetchGitHubDataServer } from '@/lib/github';

export default async function Projects() {
  // Fetch GitHub data for all projects with GitHub repos
  const reposToFetch = projects
    .filter(p => p.githubRepo)
    .map(p => p.githubRepo!);

  const githubData = await fetchGitHubDataServer(reposToFetch);

  // Sort projects by stars (descending), then by year (descending)
  const sortedProjects = [...projects].sort((a, b) => {
    const starsA = a.githubRepo ? (githubData[a.githubRepo]?.stargazers_count || 0) : 0;
    const starsB = b.githubRepo ? (githubData[b.githubRepo]?.stargazers_count || 0) : 0;

    // First, sort by stars
    if (starsA !== starsB) {
      return starsB - starsA;
    }

    // If stars are equal (or both have no stars), sort by start year
    return (b.startYear || 0) - (a.startYear || 0);
  });

  return <ProjectsClient projects={sortedProjects} initialGithubData={githubData} />;
}
