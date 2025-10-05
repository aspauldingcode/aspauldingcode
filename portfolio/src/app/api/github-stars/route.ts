import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo');

  if (!repo) {
    return NextResponse.json({ error: 'Repository parameter is required' }, { status: 400 });
  }

  try {
    // Extract owner and repo name from GitHub URL or repo string
    let owner: string;
    let repoName: string;

    if (repo.includes('github.com')) {
      // Handle full GitHub URLs like "https://github.com/owner/repo"
      const urlParts = repo.replace('https://github.com/', '').split('/');
      owner = urlParts[0];
      repoName = urlParts[1];
    } else if (repo.includes('/')) {
      // Handle "owner/repo" format
      const parts = repo.split('/');
      owner = parts[0];
      repoName = parts[1];
    } else {
      return NextResponse.json({ error: 'Invalid repository format' }, { status: 400 });
    }

    // Fetch repository data from GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Portfolio-App',
      },
      // Cache for 5 minutes to avoid hitting rate limits
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
      }
      throw new Error(`GitHub API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      full_name: data.full_name,
      html_url: data.html_url
    });

  } catch (error) {
    console.error('Error fetching GitHub stars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repository data' }, 
      { status: 500 }
    );
  }
}