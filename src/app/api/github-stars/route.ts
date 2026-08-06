import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo');
  const repos = searchParams.get('repos');

  if (!repo && !repos) {
    return NextResponse.json({ error: 'Repository or repos parameter is required' }, { status: 400 });
  }

  const fetchRepo = async (repoStr: string) => {
    try {
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
        stargazers_count: data.stargazers_count,
        forks_count: data.forks_count,
        full_name: data.full_name,
        html_url: data.html_url,
        id: repoStr // Include the original string as ID for mapping
      };
    } catch (error) {
      console.error(`Error fetching repo ${repoStr}:`, error);
      return null;
    }
  };

  if (repos) {
    const repoList = repos.split(',').filter(Boolean);
    const results = await Promise.all(repoList.map(fetchRepo));
    const indexedResults = results.reduce((acc: any, curr) => {
      if (curr) acc[curr.id] = curr;
      return acc;
    }, {});
    return NextResponse.json(indexedResults, {
      headers: {
        'Cache-Control': 's-maxage=2592000, stale-while-revalidate=86400',
      },
    });
  }

  const result = await fetchRepo(repo!);
  if (!result) {
    return NextResponse.json({ error: 'Failed to fetch repository data' }, { status: 500 });
  }
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}