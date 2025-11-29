import ProjectCard from './ProjectCard';
import type { Project } from '@/types/portfolio';

interface ProjectsProps {
  projects: Project[];
}

export default function Projects({ projects }: ProjectsProps) {
  return (
    <section id="projects" className="relative z-10 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h2
          id="projects-heading"
          className="font-display text-4xl md:text-5xl font-bold mb-16 text-center uppercase tracking-wide"
        >
          Projects
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
