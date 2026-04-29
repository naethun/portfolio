'use client';

import Image from 'next/image';
import { Bio } from '@/lib/data';
import type { Tab } from '@/types/portfolio';

const navLinks: { id: Tab; label: string }[] = [
  { id: 'about', label: 'ABOUT' },
  { id: 'experience', label: 'EXPERIENCE' },
  { id: 'projects', label: 'PROJECTS' },
];

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const selectTab = (tab: Tab) => {
    onTabChange(tab);
  };

  return (
    <nav className="relative z-50 px-6 md:px-10 pt-6 md:pt-10" aria-label="Main navigation">
      <div className="max-w-[1800px] mx-auto">
        {/* Desktop layout: 3 columns — logo / centered nav / bio */}
        <div className="hidden md:grid grid-cols-3 items-start gap-8">
          {/* Left — large logo */}
          <button
            type="button"
            onClick={() => selectTab('about')}
            className="flex items-start transition-opacity hover:opacity-70 justify-self-start"
            aria-label={`${Bio.name} — go to about`}
          >
            <Image
              src="/logo.png"
              alt={Bio.name}
              width={2172}
              height={937}
              priority
              className="h-44 md:h-46 lg:h-62 w-auto max-w-none"
            />
          </button>

          {/* Center — tab buttons */}
          <ul className="flex gap-8 items-center justify-center pt-6 lg:pt-10">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => selectTab(link.id)}
                    className={`text-sm font-display tracking-wide transition-colors ${
                      isActive
                        ? 'text-accent-primary underline underline-offset-8 decoration-1'
                        : 'hover:text-accent-primary'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Right — bio tagline + social links */}
          <div className="justify-self-end text-right max-w-md">
            <p className="text-sm text-text-secondary leading-relaxed">
                i love anything tech &amp; innovative!
                <br></br><br></br> 
                im a former sneaker bot dev. reverse-engineered anti-bot measures on nike, shopify, supreme &amp; many more. also automated tons on web3 as well. 
                generated 7-figures in profit for users.
    
                <br></br><br></br> 
                currently changing how influencers monetize content @ aesthetic. backed by tier 1 VCs along with the greatest tastemakers.
    
                <br></br><br></br> 
                &amp; im on a full ride studying cognitive science with a specialization in design &amp; interaction + computer science @ UCSD :) 
            </p>
            <div className="mt-3 flex justify-end gap-5">
              <a
                href={Bio.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-display underline tracking-wide text-accent-primary hover:text-accent-secondary transition-colors"
                aria-label="GitHub Profile"
              >
                github
              </a>
              <a
                href={Bio.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-display underline tracking-wide text-accent-primary hover:text-accent-secondary transition-colors"
                aria-label="LinkedIn Profile"
              >
                linkedin
              </a>
            </div>
          </div>
        </div>

        {/* Mobile layout: nav row on top, logo left, paragraph right */}
        <div className="md:hidden flex flex-col gap-6">
          {/* Top — nav buttons row */}
          <ul className="flex gap-6 items-center">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => selectTab(link.id)}
                    className={`text-xs font-display tracking-wide transition-colors ${
                      isActive
                        ? 'text-accent-primary underline underline-offset-4 decoration-1'
                        : 'hover:text-accent-primary'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Logo — left aligned, big */}
          <button
            type="button"
            onClick={() => selectTab('about')}
            className="flex items-start transition-opacity hover:opacity-70 self-start"
            aria-label={`${Bio.name} — go to about`}
          >
            <Image
              src="/logo.png"
              alt={Bio.name}
              width={2172}
              height={937}
              priority
              className="h-44 w-auto max-w-none"
            />
          </button>

          {/* Paragraph — right aligned */}
          <div className="text-right">
            <p className="text-xs text-text-secondary leading-relaxed">
              i love anything tech &amp; innovative!
              <br /><br />
              im a former sneaker bot dev. reverse-engineered anti-bot measures on nike, shopify, supreme &amp; many more. also automated tons on web3 as well. generated 7-figures in profit for users.
              <br /><br />
              currently changing how influencers monetize content @ aesthetic. backed by tier 1 VCs along with the greatest tastemakers.
              <br /><br />
              &amp; im on a full ride studying cognitive science with a specialization in design &amp; interaction + computer science @ UCSD :)
            </p>
            <div className="mt-3 flex justify-end gap-5">
              <a
                href={Bio.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-display underline tracking-wide text-accent-primary hover:text-accent-secondary transition-colors"
                aria-label="GitHub Profile"
              >
                github
              </a>
              <a
                href={Bio.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-display underline tracking-wide text-accent-primary hover:text-accent-secondary transition-colors"
                aria-label="LinkedIn Profile"
              >
                linkedin
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
