// Small glyphs shared by the desktop: Finder chrome, widgets and desktop icons.

const FOLDER_BACK =
  'M0.75 2.25A1.5 1.5 0 0 1 2.25 0.75h4.19a1.5 1.5 0 0 1 1.06.44L9 2.69h6.75a1.5 1.5 0 0 1 1.5 1.5v8.56a1.5 1.5 0 0 1-1.5 1.5H2.25a1.5 1.5 0 0 1-1.5-1.5z';
const FOLDER_FRONT =
  'M0.75 5.25a1.5 1.5 0 0 1 1.5-1.5h13.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H2.25a1.5 1.5 0 0 1-1.5-1.5z';

export function FolderIcon({ className = 'h-[15px] w-[18px]', muted = false }: { className?: string; muted?: boolean }) {
  return (
    <svg viewBox="0 0 18 15" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d={FOLDER_BACK} fill={muted ? '#9a9a9a' : '#6f9be0'} />
      {!muted && <path d={FOLDER_FRONT} fill="#8db2ec" />}
    </svg>
  );
}

/** Close / minimize / zoom. Inactive windows show them grey, the way macOS does. */
export function TrafficLights({ inactive = false }: { inactive?: boolean }) {
  const colors = inactive ? ['#dcdcdc', '#dcdcdc', '#dcdcdc'] : ['#ff5f57', '#febc2e', '#28c840'];
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-2">
      {colors.map((color, i) => (
        <span
          key={i}
          className="h-3 w-3 rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)]"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...stroke} strokeWidth={1.7}>
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...stroke} strokeWidth={1.7}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

export function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" {...stroke} strokeWidth={1.4}>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
    </svg>
  );
}

export function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" {...stroke} strokeWidth={1.4}>
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" {...stroke} strokeWidth={1.6}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 5.5v-.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h.5" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" {...stroke} strokeWidth={1.8}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function HandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...stroke} strokeWidth={1.6}>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5" />
      <path d="M14 11.5V6a1.5 1.5 0 0 1 3 0v8.5a6.5 6.5 0 0 1-6.5 6.5h-.6a6 6 0 0 1-4.6-2.2L3.3 15.3a1.6 1.6 0 0 1 2.4-2.1L8 15" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke} strokeWidth={1.6}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

export function DocIcon({ className = 'h-[13px] w-[11px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 16" aria-hidden="true" className={className} fill="none" stroke="#8a8a8a" strokeWidth={1.3} strokeLinejoin="round">
      <path d="M2 1.5h6.5L12 5v9.5H2z" />
      <path d="M8.5 1.5V5H12" />
    </svg>
  );
}

/** The star from the identity lockup, reused wherever the site needs its own mark. */
export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 310 320" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M176 0 184 99 270 52 212 136 310 160 212 184 270 267 184 220 176 320 141 228 75 303 102 205 0 218 84 160 0 102 102 115 75 17 141 92Z" />
    </svg>
  );
}
