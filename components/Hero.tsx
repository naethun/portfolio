'use client';

import Tesseract from './Tesseract';
import type { Bio, Tab } from '@/types/portfolio';

interface HeroProps {
  bio: Bio;
  onTabChange?: (tab: Tab) => void;
}

export default function Hero({ bio, onTabChange }: HeroProps) {
  return (
    <section id="about" className="relative z-10 flex items-center px-6 py-12 md:py-16">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left side - Bio + CTAs */}
          <div className="text-left order-2 lg:order-1">
            <p className="text-text-tertiary leading-relaxed mb-10 max-w-lg">
            Former sneaker bot developer. Reverse-engineered anti-bot measures on Nike, Shopify, & many more. Achieved thousands of successful checkouts on profitable products. Also developed blockchain automation tools, including NFT minting bots & marketplace snipers. Generated over 6-figures in profit for users.

            <br /> <br />
            Currently engineering new software. Also, studying Cognitive Science with a specialization in Machine Learning & Neural Computation + Computer Science & Engineering at UCSD. 

            <br /> <br />
            Always open to opportunities to drive innovation.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={bio.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border-2 border-accent-primary rounded font-display text-sm tracking-wide text-center
                         hover:bg-accent-primary hover:text-background-primary hover:shadow-glow transition-all duration-300
                         focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary"
              >
                VIEW RESUME
              </a>
              <a
                href={bio.github}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border border-border-primary rounded font-display text-sm tracking-wide text-center
                         hover:border-accent-primary hover:text-accent-primary transition-all duration-300
                         focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary"
              >
                GITHUB
              </a>
              <a
                href={bio.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border border-border-primary rounded font-display text-sm tracking-wide text-center
                         hover:border-accent-primary hover:text-accent-primary transition-all duration-300
                         focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary"
              >
                LINKEDIN
              </a>
            </div>

            {/* Scroll indicator */}
            <div className="mt-16">
              <button
                type="button"
                onClick={() => onTabChange?.('experience')}
                className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-accent-primary transition-colors group"
                aria-label="Learn more about me"
              >
                <span className="font-display tracking-wide">Learn more about me</span>
                <svg
                  className="w-4 h-4 group-hover:translate-y-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Right side - Tesseract Animation */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <div className="w-40 md:w-96 lg:w-full max-w-2xl aspect-square relative">
              <div className="absolute inset-30 bg-gradient-to-br from-accent-primary/10 to-transparent rounded-xl blur-2xl" />
              <div className="relative w-full h-full flex items-center justify-center">
                <Tesseract />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
