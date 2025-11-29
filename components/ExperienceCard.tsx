import Image from 'next/image';
import type { Experience } from '@/types/portfolio';

interface ExperienceCardProps {
  experience: Experience;
}

export default function ExperienceCard({ experience }: ExperienceCardProps) {
  // Split description into bullet points (looking for lines that start with "-" or are separate paragraphs)
  const descriptionLines = experience.desc
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return (
    <article
      className="relative border border-[#202029] rounded-lg p-6 md:p-8
                 bg-[#101015]/30 backdrop-blur-sm
                 transition-all duration-300
                 hover:border-[#6366f1] hover:-translate-y-1 hover:shadow-glow
                 group"
    >
      {/* Timeline dot accent */}
      <div
        className="absolute -left-3 top-8 w-6 h-6 rounded-full bg-[#101015] border-2 border-[#6366f1]
                   group-hover:bg-[#6366f1] transition-colors"
        aria-hidden="true"
      />

      {/* Company Logo */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden bg-white/5 p-2">
          <Image
            src={experience.img}
            alt={`${experience.company} logo`}
            fill
            className="object-contain"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl md:text-2xl font-bold mb-1">
            {experience.role}
          </h3>
          <p className="text-[#6366f1] font-display tracking-wide">
            {experience.company}
          </p>
          <p className="text-sm text-gray-400 mt-1">{experience.date}</p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3 text-gray-300 mb-6">
        {descriptionLines.map((line, index) => (
          <p key={index} className="text-sm leading-relaxed">
            {line}
          </p>
        ))}
      </div>

      {/* Skills Tags */}
      <div className="flex flex-wrap gap-2">
        {experience.skills.map((skill) => (
          <span
            key={skill}
            className="px-3 py-1 text-xs font-display tracking-wide
                     border border-[#202029] rounded-full
                     bg-[#050509]/50
                     group-hover:border-[#6366f1]/50 transition-colors"
          >
            {skill}
          </span>
        ))}
      </div>
    </article>
  );
}
