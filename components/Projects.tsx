'use client';

import { useState } from 'react';
import ProjectCard from './ProjectCard';
import ProjectModal from './ProjectModal';
import type { Project } from '@/types/portfolio';

interface ProjectsProps {
  projects: Project[];
}

export default function Projects({ projects }: ProjectsProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Calculate remainder for centering logic
  const remainder = projects.length % 3;

  return (
    <section id="projects" className="relative z-10 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2
          id="projects-heading"
          className="font-display text-4xl md:text-5xl font-bold mb-16 text-center uppercase tracking-wide"
        >
          Projects
        </h2>

        {/* Main grid for complete rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.slice(0, projects.length - remainder).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => setSelectedProject(project)}
            />
          ))}
        </div>

        {/* Centered flex container for incomplete last row */}
        {remainder > 0 && (
          <div className="flex flex-wrap justify-center gap-6 mt-6">
            {projects.slice(-remainder).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => setSelectedProject(project)}
                className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedProject && (
          <ProjectModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </div>
    </section>
  );
}
