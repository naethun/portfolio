'use client';

import Image from 'next/image';
import { Bio } from '@/lib/data';
import type { UniverseMedia } from '@/lib/getUniverseMedia';
import { CheckIcon, CopyIcon } from '@/components/Finder/icons';
import { useCopyText } from '@/hooks/useCopyText';
import { ageLine, statusRoles, statusSignals } from './statusRail.mjs';

interface StatusRailProps {
  /** Moodboard image for the preview widget; the widget hides when there is none. */
  cover: UniverseMedia | null;
  onOpenMoodboard: () => void;
}

/** The right side of the desktop: status, the two numbers, a moodboard preview and contact, as widgets. */
export default function StatusRail({ cover, onOpenMoodboard }: StatusRailProps) {
  const { copied, failed, copy } = useCopyText();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <section aria-label="Current status" className="desktop-widget p-[22px] md:row-span-2 xl:shrink-0">
        <p className="text-2xl leading-none tracking-[-0.045em] text-neutral-950">{ageLine}</p>
        <ul className="mt-[22px] space-y-[18px]">
          {statusRoles.map((role) => (
            <li key={role.index}>
              <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-neutral-950">{role.title}</h2>
              {role.details.map((detail) => (
                <p key={detail} className="mt-1 text-[13px] leading-[1.45] text-[#6b6b6b] text-pretty">
                  {detail}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="By the numbers" className="desktop-widget grid grid-cols-2 gap-4 p-[22px] xl:shrink-0">
        {statusSignals.map((signal) => (
          <div key={signal.value}>
            <p className="text-[34px] font-semibold leading-[0.9] tracking-[-0.055em] text-neutral-950">{signal.value}</p>
            <p className="mt-2.5 text-[12.5px] leading-[1.4] text-[#6b6b6b]">{signal.copy}</p>
          </div>
        ))}
      </section>

      {cover && (
        <button
          type="button"
          onClick={onOpenMoodboard}
          aria-label="Open moodboard"
          className="desktop-widget desktop-widget-optional group relative block aspect-[16/10] w-full overflow-hidden text-left md:col-span-2 md:row-start-3 md:aspect-[2/1] xl:aspect-auto xl:min-h-[150px] xl:flex-1"
        >
          <Image
            src={cover.src}
            alt=""
            fill
            loading="eager"
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 720px, 360px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[72px] bg-gradient-to-b from-transparent to-black/55" />
          <span aria-hidden="true" className="absolute bottom-4 left-[18px] flex items-center gap-1.5 text-sm font-medium text-white">
            moodboard <span>→</span>
          </span>
        </button>
      )}

      <section aria-label="Contact" className="desktop-widget flex flex-col gap-1.5 py-[18px] pl-[22px] pr-3.5 xl:shrink-0">
        <p className="text-[12.5px] leading-[1.4] text-[#6b6b6b]">always open to new opportunities!</p>
        <div className="flex items-center justify-between gap-2">
          <a
            href={`mailto:${Bio.email}`}
            className="min-w-0 truncate text-[15px] font-medium tracking-[-0.01em] text-neutral-950 underline-offset-4 hover:underline"
          >
            {Bio.email}
          </a>
          <button
            type="button"
            onClick={() => copy(Bio.email)}
            aria-label={copied ? 'Email copied' : 'Copy email'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5 text-neutral-800 transition-colors hover:bg-black/10"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <p role="status" className={failed ? 'text-[12.5px] text-[#6b6b6b]' : 'sr-only'}>
          {failed ? 'Couldn’t copy. Select the address to copy it.' : copied ? 'Email copied to clipboard.' : ''}
        </p>
      </section>
    </div>
  );
}
