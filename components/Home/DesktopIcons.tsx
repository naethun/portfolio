import { Bio } from '@/lib/data';

const files = [
  { label: 'resume', href: Bio.resume, kind: 'document' },
  { label: 'github', href: Bio.github, kind: 'link' },
  { label: 'linkedin', href: Bio.linkedin, kind: 'link' },
] as const;

/** Links as files left on the desktop. Focus highlights the label the way Finder selects one. */
export default function DesktopIcons() {
  return (
    <nav aria-label="Elsewhere">
      <ul className="flex gap-2">
        {files.map((file) => (
          <li key={file.label}>
            <a
              href={file.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-[84px] flex-col items-center gap-2 rounded-lg py-1.5 text-neutral-900 focus-visible:outline-none"
            >
              <span className="relative flex h-14 w-11 items-center justify-center rounded-[3px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.14)] transition-transform duration-200 group-hover:-translate-y-0.5">
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-3 w-3 rounded-bl-[2px] bg-[linear-gradient(225deg,#e7e7e6_50%,#ffffff_50%)] shadow-[-1px_1px_0_rgba(0,0,0,0.1)]"
                />
                {file.kind === 'document' ? <DocumentLines /> : <LinkGlyph />}
              </span>
              <span className="rounded px-1.5 py-px text-xs leading-tight transition-colors group-hover:bg-black/[0.06] group-focus-visible:bg-[#2f6fec] group-focus-visible:text-white">
                {file.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DocumentLines() {
  return (
    <span aria-hidden="true" className="absolute inset-x-2 top-3 flex flex-col gap-[3px]">
      <span className="h-0.5 w-3/4 bg-[#c9c9c9]" />
      <span className="h-0.5 bg-[#dedede]" />
      <span className="h-0.5 w-5/6 bg-[#dedede]" />
      <span className="h-0.5 w-2/3 bg-[#dedede]" />
      <span className="h-0.5 bg-[#dedede]" />
    </span>
  );
}

function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="#5a7fc0" strokeWidth={1.8} strokeLinecap="round">
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2" />
    </svg>
  );
}
