'use client';

import { useState } from 'react';
import { Bio } from '@/lib/data';

interface Row {
  label: string;
  value: string;
  href?: string;
  copy?: string;
}

const rows: Row[] = [
  { label: 'name', value: 'nathan tran' },
  { label: 'based in', value: 'san diego & los angeles, ca' },
  {
    label: 'email',
    value: 'nathan@myaesthetic.ai',
    href: 'mailto:nathan@myaesthetic.ai',
    copy: 'nathan@myaesthetic.ai',
  },
  {
    label: 'github',
    value: 'github.com/naethun',
    href: Bio.github,
    copy: Bio.github,
  },
  {
    label: 'linkedin',
    value: 'linkedin.com/in/naethun',
    href: Bio.linkedin,
    copy: Bio.linkedin,
  },
  {
    label: 'resume',
    value: 'view resume',
    href: Bio.resume,
  },
];

export default function ContactCard() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied((cur) => (cur === label ? null : cur)), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-5 py-8 md:px-10">
      <div className="w-full max-w-md rounded-xl bg-white px-6 py-7 ring-1 ring-black/10 shadow-sm md:px-8 md:py-8">
        <p className="mb-4 font-mono text-[11px] tracking-wider text-neutral-500">
          contact.vcf — preview
        </p>
        <ul className="divide-y divide-black/5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  {row.label}
                </p>
                {row.href ? (
                  <a
                    href={row.href}
                    target={row.href.startsWith('http') ? '_blank' : undefined}
                    rel={row.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="block truncate font-mono text-sm text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-700"
                  >
                    {row.value}
                  </a>
                ) : (
                  <p className="truncate font-mono text-sm text-neutral-900">
                    {row.value}
                  </p>
                )}
              </div>
              {row.copy && (
                <button
                  type="button"
                  onClick={() => handleCopy(row.label, row.copy!)}
                  className="shrink-0 rounded-md border border-black/10 bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-neutral-600 transition hover:border-black/30 hover:text-neutral-900"
                >
                  {copied === row.label ? 'copied' : 'copy'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
