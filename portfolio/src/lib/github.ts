export interface GitHubRepoData {
  stargazers_count: number;
  forks_count: number;
  full_name: string;
  html_url: string;
}

export async function fetchGitHubStars(repoUrl: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/github-stars?repo=${encodeURIComponent(repoUrl)}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch GitHub stars for ${repoUrl}:`, response.statusText);
      return null;
    }

    const data: GitHubRepoData = await response.json();
    return data.stargazers_count;
  } catch (error) {
    console.error(`Error fetching GitHub stars for ${repoUrl}:`, error);
    return null;
  }
}

export async function fetchGitHubRepoData(repoUrl: string): Promise<GitHubRepoData | null> {
  try {
    const response = await fetch(`/api/github-stars?repo=${encodeURIComponent(repoUrl)}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch GitHub repo data for ${repoUrl}:`, response.statusText);
      return null;
    }

    const data: GitHubRepoData = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching GitHub repo data for ${repoUrl}:`, error);
    return null;
  }
}

export async function fetchMultipleGitHubRepoData(repos: string[]): Promise<Record<string, GitHubRepoData>> {
  const results: Record<string, GitHubRepoData> = {};
  
  // Fetch all repositories in parallel
  const promises = repos.map(async (repo) => {
    const repoData = await fetchGitHubRepoData(repo);
    if (repoData !== null) {
      results[repo] = repoData;
    }
  });

  await Promise.all(promises);
  return results;
}

export async function fetchMultipleGitHubStars(repos: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  
  // Fetch all repositories in parallel
  const promises = repos.map(async (repo) => {
    const stars = await fetchGitHubStars(repo);
    if (stars !== null) {
      results[repo] = stars;
    }
  });

  await Promise.all(promises);
  return results;
}