import Image from 'next/image';
import type { Experience } from '@/types/portfolio';

interface ExperienceCardProps {
  experience: Experience;
  onClick?: () => void;
  className?: string;
}

export default function ExperienceCard({ experience, onClick, className }: ExperienceCardProps) {
  // Split description into bullet points (looking for lines that start with "-" or are separate paragraphs)
  const descriptionLines = experience.desc
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Get first sentence for preview (first line or first complete sentence)
  const firstSentence = descriptionLines[0] || '';

  return (
    <article
      onClick={onClick}
      className={`relative border border-[#202029] rounded-lg p-6 md:p-8
                 bg-[#101015]/30 backdrop-blur-sm
                 transition-all duration-300
                 hover:border-[#d4c5a9] hover:-translate-y-1 hover:shadow-glow
                 group ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
    >

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
          <h3 className="font-display text-lg md:text-lg font-bold mb-1">
            {experience.role}
          </h3>
          <p className="text-[#d4c5a9] font-display text-md tracking-wide">
            {experience.company}
          </p>
          <p className="text-sm text-gray-400 mt-1">{experience.date}</p>
        </div>
      </div>

      {/* Description */}
      <div className="text-gray-300 mb-6">
        <p className="text-sm leading-relaxed line-clamp-3">
          {firstSentence}
        </p>
      </div>

      {/* Skills Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {experience.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="px-3 py-1 text-xs font-display tracking-wide
                     border border-[#202029] rounded-full
                     bg-[#050509]/50
                     group-hover:border-[#d4c5a9]/50 transition-colors"
          >
            {skill}
          </span>
        ))}
        {experience.skills.length > 4 && (
          <span className="px-3 py-1 text-xs text-gray-400">
            +{experience.skills.length - 4} more
          </span>
        )}
      </div>

      {/* View Details Indicator */}
      {onClick && (
        <div className="text-xs text-[#d4c5a9] flex items-center gap-1">
          <span>View Details</span>
          <svg
            className="w-4 h-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </article>
  );
}
