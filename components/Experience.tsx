'use client';

import { useState } from 'react';
import ExperienceCard from './ExperienceCard';
import ExperienceModal from './ExperienceModal';
import type { Experience } from '@/types/portfolio';

interface ExperienceProps {
  experiences: Experience[];
}

export default function Experience({ experiences }: ExperienceProps) {
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  // Calculate remainder for centering logic
  const remainder = experiences.length % 3;
  return (
    <section id="experience" className="relative z-10 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2
          id="experience-heading"
          className="font-display text-4xl md:text-5xl font-bold mb-16 text-center uppercase tracking-wide"
        >
          Experience
        </h2>

        {/* Main grid for complete rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.slice(0, experiences.length - remainder).map((experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              onClick={() => setSelectedExperience(experience)}
            />
          ))}
        </div>

        {/* Centered flex container for incomplete last row */}
        {remainder > 0 && (
          <div className="flex flex-wrap justify-center gap-6 mt-6">
            {experiences.slice(-remainder).map((experience) => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                onClick={() => setSelectedExperience(experience)}
                className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedExperience && (
          <ExperienceModal
            experience={selectedExperience}
            onClose={() => setSelectedExperience(null)}
          />
        )}
      </div>
    </section>
  );
}
