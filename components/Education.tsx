import EducationCard from './EducationCard';
import type { Education } from '@/types/portfolio';

interface EducationProps {
  education: Education[];
}

export default function Education({ education }: EducationProps) {
  return (
    <section id="education" className="relative z-10 py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h2
          id="education-heading"
          className="font-display text-4xl md:text-5xl font-bold mb-16 text-center uppercase tracking-wide"
        >
          Education
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {education.map((edu) => (
            <EducationCard key={edu.id} education={edu} />
          ))}
        </div>
      </div>
    </section>
  );
}
