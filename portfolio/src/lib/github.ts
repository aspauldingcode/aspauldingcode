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
  if (repos.length === 0) return {};

  try {
    const response = await fetch(`/api/github-stars?repos=${encodeURIComponent(repos.join(','))}`);

    if (!response.ok) {
      console.error('Failed to fetch multiple GitHub repo data:', response.statusText);
      return {};
    }

    const data: Record<string, GitHubRepoData> = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching multiple GitHub repo data:', error);
    return {};
  }
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

/**
 * Server-side GitHub data fetcher
 * Calls GitHub API directly (not through /api route)
 * Used in server components for pre-rendering
 */
export async function fetchGitHubDataServer(repos: string[]): Promise<Record<string, GitHubRepoData>> {
  if (repos.length === 0) return {};

  const results: Record<string, GitHubRepoData> = {};

  try {
    const promises = repos.map(async (repoStr) => {
      try {
        // Parse repo URL to owner/name format
        let owner: string;
        let repoName: string;

        if (repoStr.includes('github.com')) {
          const urlParts = repoStr.replace('https://github.com/', '').split('/');
          owner = urlParts[0];
          repoName = urlParts[1];
        } else if (repoStr.includes('/')) {
          const parts = repoStr.split('/');
          owner = parts[0];
          repoName = parts[1];
        } else {
          return null;
        }

        // Fetch directly from GitHub API
        const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
          headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Portfolio-App',
          },
          next: { revalidate: 2592000 } // Cache for 30 days
        });

        if (!response.ok) return null;

        const data = await response.json();
        return {
          repo: repoStr,
          data: {
            stargazers_count: data.stargazers_count,
            forks_count: data.forks_count,
            full_name: data.full_name,
            html_url: data.html_url,
          }
        };
      } catch (error) {
        console.error(`Error fetching repo ${repoStr}:`, error);
        return null;
      }
    });

    const fetchedData = await Promise.all(promises);

    // Build results object
    for (const item of fetchedData) {
      if (item) {
        results[item.repo] = item.data;
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching GitHub data on server:', error);
    return {};
  }
}