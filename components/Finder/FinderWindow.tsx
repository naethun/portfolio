'use client';

import type { ReactNode, Ref } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, FolderIcon, TrafficLights } from './icons';

interface NavControl {
  enabled: boolean;
  label: string;
  onClick: () => void;
}

interface FinderWindowProps {
  title: string;
  /** Vertical sidebar, shown from md up. */
  sidebar: ReactNode;
  /** Folder switcher shown under the toolbar on phones. */
  mobileNav?: ReactNode;
  back?: NavControl;
  forward?: NavControl;
  /** Right side of the toolbar. */
  actions?: ReactNode;
  /** Path bar segments, e.g. ["naethun.dev", "work", "Aesthetic"]. */
  path: string[];
  /** Right side of the path bar, e.g. "8 items". */
  status?: string;
  contentRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

const toolbarButton =
  'h-11 w-9 items-center justify-center rounded-lg transition-colors enabled:text-neutral-800 enabled:hover:bg-black/5 disabled:text-neutral-300';

export default function FinderWindow({
  title,
  sidebar,
  mobileNav,
  back,
  forward,
  actions,
  path,
  status,
  contentRef,
  children,
}: FinderWindowProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.14),0_34px_70px_-22px_rgba(0,0,0,0.36),0_2px_8px_rgba(0,0,0,0.06)] md:flex-row">
      <div className="hidden w-[156px] shrink-0 flex-col border-r border-black/[0.08] bg-[#f3f3f3] px-2.5 md:flex">
        <div className="flex h-[52px] items-center pl-1.5">
          <TrafficLights />
        </div>
        {sidebar}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-[52px] shrink-0 items-center gap-0.5 border-b border-black/[0.08] pl-3.5 pr-2.5 md:pl-2">
          <span className="mr-2.5 md:hidden">
            <TrafficLights />
          </span>
          {back && (
            <button
              type="button"
              onClick={back.onClick}
              disabled={!back.enabled}
              aria-label={back.label}
              className={`${toolbarButton} ${back.enabled ? 'flex' : 'hidden md:flex'}`}
            >
              <ChevronLeftIcon />
            </button>
          )}
          {forward && (
            <button
              type="button"
              onClick={forward.onClick}
              disabled={!forward.enabled}
              aria-label={forward.label}
              className={`${toolbarButton} hidden md:flex`}
            >
              <ChevronRightIcon />
            </button>
          )}
          <h2 className="ml-1.5 min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-950 md:ml-2">
            {title}
          </h2>
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-3">{actions}</div>
        </div>

        {mobileNav && <div className="border-b border-black/[0.08] px-3 py-2.5 md:hidden">{mobileNav}</div>}

        <div ref={contentRef} className="relative min-h-0 flex-1 overflow-y-auto bg-white">
          {children}
        </div>

        <div className="flex h-[30px] shrink-0 items-center justify-between gap-3 border-t border-black/[0.08] px-3.5 text-xs text-[#6e6e6e]">
          <p className="flex min-w-0 items-center gap-1.5">
            <FolderIcon muted className="h-[11px] w-[13px]" />
            <span className="truncate">
              {path.map((segment, i) => (
                <span key={`${segment}-${i}`}>
                  {i > 0 && (
                    <span aria-hidden="true" className="mx-1">
                      ›
                    </span>
                  )}
                  {segment}
                </span>
              ))}
            </span>
          </p>
          {status && <span className="shrink-0 tabular-nums">{status}</span>}
        </div>
      </div>
    </div>
  );
}
