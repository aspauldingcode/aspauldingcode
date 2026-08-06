import ResumeContent from '@/components/ResumeContent';
import { resume } from '@/content/resume';

export const metadata = {
  title: `Resume · ${resume.basics.name}`,
  description: resume.basics.summary ?? resume.basics.label,
};

export default function ResumePage() {
  return <ResumeContent />;
}
