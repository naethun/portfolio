'use client';

import { Bio } from '@/lib/data';
import { CheckIcon, CopyIcon, StarMark } from '@/components/Finder/icons';
import { useCopyText } from '@/hooks/useCopyText';

const links = [
  { label: 'GitHub', value: 'github.com/naethun', href: Bio.github },
  { label: 'LinkedIn', value: 'linkedin.com/in/naethun', href: Bio.linkedin },
  { label: 'Resume', value: 'View resume', href: Bio.resume },
];

const row = 'grid min-h-[52px] grid-cols-[76px_minmax(0,1fr)_44px] items-center border-b border-black/10';

/** Contact as a Get Info panel: the mark as the icon, then the ways to reach Nathan. */
export default function ContactCard() {
  const { copied, failed, copy } = useCopyText();

  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10 md:px-6">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center bg-black text-white">
            <StarMark className="h-[41px] w-10" />
          </span>
          <div className="min-w-0">
            <h3 className="text-2xl font-normal leading-tight tracking-[-0.03em] text-neutral-950">{Bio.fullName}</h3>
            <p className="mt-1 text-sm text-[#6b6b6b]">always open to new opportunities!</p>
          </div>
        </div>

        <dl className="mt-7 border-t border-black/10">
          <div className={row}>
            <dt className="text-[13px] text-[#6b6b6b]">Email</dt>
            <dd className="min-w-0">
              <a
                href={`mailto:${Bio.email}`}
                className="text-sm text-neutral-950 underline-offset-4 [overflow-wrap:anywhere] hover:underline"
              >
                {Bio.email}
              </a>
            </dd>
            <dd className="flex justify-end">
              <button
                type="button"
                onClick={() => copy(Bio.email)}
                aria-label={copied ? 'Email copied' : 'Copy email'}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-neutral-800 transition-colors hover:bg-black/5"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </dd>
          </div>
          {links.map((link) => (
            <div key={link.label} className={row}>
              <dt className="text-[13px] text-[#6b6b6b]">{link.label}</dt>
              <dd className="col-span-2 min-w-0">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[52px] items-center justify-between gap-3 text-sm text-neutral-950 underline-offset-4 hover:underline"
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">{link.value}</span>
                  <span aria-hidden="true" className="w-11 shrink-0 text-center text-[15px]">
                    ↗
                  </span>
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <p role="status" className={failed ? 'mt-3 text-[13px] text-[#6b6b6b]' : 'sr-only'}>
          {failed ? 'Couldn’t copy. Select the address above to copy it.' : copied ? 'Email copied to clipboard.' : ''}
        </p>
      </div>
    </div>
  );
}
