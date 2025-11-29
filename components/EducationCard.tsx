import Image from 'next/image';
import type { Education } from '@/types/portfolio';

interface EducationCardProps {
  education: Education;
}

export default function EducationCard({ education }: EducationCardProps) {
  return (
    <article
      className="border border-[#202029] rounded-lg p-6 md:p-8
                 bg-[#101015]/30 backdrop-blur-sm
                 transition-all duration-300
                 hover:border-[#6366f1] hover:-translate-y-1 hover:shadow-glow"
    >
      {/* School Logo and Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden bg-white/5 p-2">
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
          <p className="text-[#6366f1] font-display text-sm md:text-base">
            {education.degree}
          </p>
          <p className="text-sm text-gray-400 mt-1">{education.date}</p>
        </div>
      </div>

      {/* Grade */}
      <div className="mb-4">
        <span className="inline-block px-3 py-1 text-sm border border-[#202029] rounded-full bg-[#050509]/50">
          {education.grade}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 leading-relaxed">
        {education.desc}
      </p>
    </article>
  );
}
