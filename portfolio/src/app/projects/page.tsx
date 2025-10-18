import { projects } from './projectData';
import ProjectsClient from './ProjectsClient';

export default function Projects() {
  return <ProjectsClient projects={projects} />;
}
