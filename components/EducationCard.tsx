import Image from 'next/image';
import type { Education } from '@/types/portfolio';

interface EducationCardProps {
  education: Education;
}

export default function EducationCard({ education }: EducationCardProps) {
  return (
    <article
      className="border border-border-primary rounded-lg p-6 md:p-8
                 bg-background-card/30 backdrop-blur-sm
                 transition-all duration-300
                 hover:border-accent-primary hover:-translate-y-1 hover:shadow-glow"
    >
      {/* School Logo and Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden bg-[var(--color-image-bg)] p-2">
          <Image
            src={education.img}
            alt={`${education.school} logo`}
            fill
            className="object-contain"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl md:text-2xl font-bold mb-1">
            {education.school}
          </h3>
          <p className="text-accent-primary font-display text-sm md:text-base">
            {education.degree}
          </p>
          <p className="text-sm text-text-tertiary mt-1">{education.date}</p>
        </div>
      </div>

      {/* Grade */}
      <div className="mb-4">
        <span className="inline-block px-3 py-1 text-sm border border-border-primary rounded-full bg-background-primary/50">
          {education.grade}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary leading-relaxed">
        {education.desc}
      </p>
    </article>
  );
}
