import { projects } from './projectData';
import ProjectsClient from './ProjectsClient';

export const revalidate = 2592000; // Revalidate every 30 days

export default async function Projects() {
  // Sort projects by start year (descending) as stable default
  const sortedProjects = [...projects].sort((a, b) => {
    return (b.startYear || 0) - (a.startYear || 0);
  });

  const initialGithubData = {
    'https://github.com/aspauldingcode/apple-sharpener': {
      stargazers_count: 269,
      forks_count: 6,
      full_name: 'aspauldingcode/apple-sharpener',
      html_url: 'https://github.com/aspauldingcode/apple-sharpener'
    },
    'https://github.com/Wawona/Wawona': {
      stargazers_count: 176,
      forks_count: 0,
      full_name: 'Wawona/Wawona',
      html_url: 'https://github.com/Wawona/Wawona'
    },
    'https://github.com/aspauldingcode/macwmfx': {
      stargazers_count: 57,
      forks_count: 0,
      full_name: 'aspauldingcode/macwmfx',
      html_url: 'https://github.com/aspauldingcode/macwmfx'
    },
    'https://github.com/aspauldingcode/zoomer': {
      stargazers_count: 10,
      forks_count: 0,
      full_name: 'aspauldingcode/zoomer',
      html_url: 'https://github.com/aspauldingcode/zoomer'
    },
    'https://github.com/aspauldingcode/AltCore': {
      stargazers_count: 10,
      forks_count: 0,
      full_name: 'aspauldingcode/AltCore',
      html_url: 'https://github.com/aspauldingcode/AltCore'
    },
    'https://github.com/aspauldingcode/.dotfiles': {
      stargazers_count: 9,
      forks_count: 0,
      full_name: 'aspauldingcode/.dotfiles',
      html_url: 'https://github.com/aspauldingcode/.dotfiles'
    },
    'https://github.com/aspauldingcode/Hider': {
      stargazers_count: 8,
      forks_count: 0,
      full_name: 'aspauldingcode/Hider',
      html_url: 'https://github.com/aspauldingcode/Hider'
    },
    'https://github.com/aspauldingcode/Yeetbar': {
      stargazers_count: 6,
      forks_count: 0,
      full_name: 'aspauldingcode/Yeetbar',
      html_url: 'https://github.com/aspauldingcode/Yeetbar'
    },
    'https://github.com/aspauldingcode/TintedThemingSwift': {
      stargazers_count: 2,
      forks_count: 0,
      full_name: 'aspauldingcode/TintedThemingSwift',
      html_url: 'https://github.com/aspauldingcode/TintedThemingSwift'
    },
    'https://github.com/aspauldingcode/aspauldingcode': {
      stargazers_count: 4,
      forks_count: 0,
      full_name: 'aspauldingcode/aspauldingcode',
      html_url: 'https://github.com/aspauldingcode/aspauldingcode'
    },
    'https://github.com/aspauldingcode/Whisperer': {
      stargazers_count: 0,
      forks_count: 0,
      full_name: 'aspauldingcode/Whisperer',
      html_url: 'https://github.com/aspauldingcode/Whisperer'
    },
    'https://github.com/aspauldingcode/PlatformChat': {
      stargazers_count: 0,
      forks_count: 0,
      full_name: 'aspauldingcode/PlatformChat',
      html_url: 'https://github.com/aspauldingcode/PlatformChat'
    },
    'https://github.com/aspauldingcode/TintedMac': {
      stargazers_count: 0,
      forks_count: 0,
      full_name: 'aspauldingcode/TintedMac',
      html_url: 'https://github.com/aspauldingcode/TintedMac'
    },
    'https://github.com/aspauldingcode/iproute2-pretty': {
      stargazers_count: 0,
      forks_count: 0,
      full_name: 'aspauldingcode/iproute2-pretty',
      html_url: 'https://github.com/aspauldingcode/iproute2-pretty'
    }
  };

  return <ProjectsClient projects={sortedProjects} initialGithubData={initialGithubData} />;
}
