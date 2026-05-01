'use client';

import { Bio } from '@/lib/data';

export default function ReadmePreview() {
  return (
    <div className="rounded-xl bg-neutral-50 px-5 py-5 ring-1 ring-black/10 shadow-sm md:px-6 md:py-6">
      <p className="mb-3 font-mono text-[11px] tracking-wider text-neutral-500">
        readme.txt — preview
      </p>
      <div className="space-y-3 font-mono text-[12.5px] leading-relaxed text-neutral-800 md:text-sm">
        <p>
          hello, i&apos;m nathan. based in san diego &amp; los angeles.
        </p>
        <p>
          former sneaker bot dev. reverse-engineered anti-bot measures on nike,
          shopify, supreme &amp; many more. generated 7-figures in profit for
          users.
        </p>
        <p>
          currently changing how influencers monetize content @ aesthetic.
          backed by tier 1 vcs alongside the greatest tastemakers.
        </p>
        <p>im also studying cognitive science (design &amp; interaction) + computer science @ ucsd on a full ride.</p>
      </div>

      <div className="mt-5 flex gap-5">
        <a
          href={Bio.github}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-neutral-700 underline underline-offset-4 transition-colors hover:text-black"
        >
          github
        </a>
        <a
          href={Bio.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-neutral-700 underline underline-offset-4 transition-colors hover:text-black"
        >
          linkedin
        </a>
        <a
          href={Bio.resume}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-neutral-700 underline underline-offset-4 transition-colors hover:text-black"
        >
          resume
        </a>
      </div>
    </div>
  );
}
