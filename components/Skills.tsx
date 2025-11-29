import SkillChip from './SkillChip';
import type { SkillCategory } from '@/types/portfolio';

interface SkillsProps {
  skills: SkillCategory[];
}

export default function Skills({ skills }: SkillsProps) {
  return (
    <section id="skills" className="relative z-10 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h2
          id="skills-heading"
          className="font-display text-4xl md:text-5xl font-bold mb-16 text-center uppercase tracking-wide"
        >
          Skills
        </h2>

        <div className="space-y-12">
          {skills.map((category) => (
            <div key={category.title}>
              <h3 className="font-display text-xl md:text-2xl uppercase tracking-wide mb-6 text-[#d4c5a9] border-l-4 border-[#d4c5a9] pl-4">
                {category.title}
              </h3>
              <div className="flex flex-wrap gap-3" role="list">
                {category.skills.map((skill) => (
                  <SkillChip key={skill.name} name={skill.name} image={skill.image} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
