import ExperienceCard from './ExperienceCard';
import type { Experience } from '@/types/portfolio';

interface ExperienceProps {
  experiences: Experience[];
}

export default function Experience({ experiences }: ExperienceProps) {
  return (
    <section id="experience" className="relative z-10 py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h2
          id="experience-heading"
          className="font-display text-4xl md:text-5xl font-bold mb-16 text-center uppercase tracking-wide"
        >
          Experience
        </h2>

        {/* Timeline container */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#6366f1] via-[#202029] to-[#6366f1]"
            aria-hidden="true"
          />

          {/* Experience cards */}
          <div className="ml-6 space-y-12">
            {experiences.map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
