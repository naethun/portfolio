import { DocIcon, TrafficLights } from '@/components/Finder/icons';

/** The readme as an inactive TextEdit window sitting on the desktop. */
export default function ReadmePreview() {
  return (
    <section
      aria-label="readme.txt"
      className="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_16px_34px_-16px_rgba(0,0,0,0.3)]"
    >
      <div className="relative flex h-[38px] items-center border-b border-black/[0.08] bg-[#f6f6f6] px-3">
        <TrafficLights inactive />
        <p className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-[12.5px] font-semibold text-[#6e6e6e]">
          <DocIcon />
          readme.txt
        </p>
      </div>
      <div className="space-y-3.5 px-5 pb-[22px] pt-[18px] text-[15px] leading-[1.55] text-[#1f1f1f] text-pretty">
        <p>
          former sneaker bot dev. reverse-engineered anti-bot measures on nike, shopify, supreme &amp; many more.
          generated 7-figures in profit for users.
        </p>
        <p>
          currently changing how influencers monetize content @ aesthetic. backed by tier 1 vcs alongside the greatest
          tastemakers.
        </p>
      </div>
    </section>
  );
}
