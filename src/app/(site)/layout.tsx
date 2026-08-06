import HomeContent from '@/components/HomeContent';
import ImageWarmCache from '@/components/ImageWarmCache';
import SplitShell from '@/components/SplitShell';
import { projects } from '@/content/projects';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ImageWarmCache
        projects={projects.map((p) => ({ slug: p.slug, images: p.images }))}
      />
      <SplitShell home={<HomeContent />}>{children}</SplitShell>
    </>
  );
}
