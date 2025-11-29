import Image from 'next/image';

interface SkillChipProps {
  name: string;
  image: string;
}

export default function SkillChip({ name, image }: SkillChipProps) {
  return (
    <span
      className="inline-flex items-center gap-2 px-8
                 border border-[#202029] rounded-full
                 bg-[#101015]/50 backdrop-blur-sm
                 transition-all duration-300
                 hover:border-[#d4c5a9] hover:shadow-glow hover:scale-105
                 cursor-default"
      role="listitem"
    >
      <Image
        src={image}
        alt={`${name} logo`}
        width={20}
        height={20}
        className="object-contain"
      />
      <span className="text-sm font-display tracking-wide">{name}</span>
    </span>
  );
}
