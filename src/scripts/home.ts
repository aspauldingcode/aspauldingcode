import { bootContributionGraph } from '@/scripts/contribution-graph';
import { bootHireMe } from '@/scripts/hire-me';
import { bootImageWarm } from '@/scripts/image-warm';
import { bootPrefetchView } from '@/scripts/prefetch-view';

type WarmProject = { slug: string; images: string[] };

function readWarmProjects(): WarmProject[] {
  const el = document.getElementById('image-warm-data');
  if (!el?.textContent) return [];
  try {
    const parsed = JSON.parse(el.textContent) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is WarmProject => {
      return (
        Boolean(row) &&
        typeof row === 'object' &&
        typeof (row as WarmProject).slug === 'string' &&
        Array.isArray((row as WarmProject).images)
      );
    });
  } catch {
    return [];
  }
}

bootHireMe();
bootPrefetchView();
bootImageWarm(readWarmProjects());
bootContributionGraph();
