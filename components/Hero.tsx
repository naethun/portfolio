'use client';

import { useState, useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Tesseract from './Tesseract';
import type { Bio } from '@/types/portfolio';

interface HeroProps {
  bio: Bio;
}

export default function Hero({ bio }: HeroProps) {
  const [roleIndex, setRoleIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % bio.roles.length);
    }, 1500); // Change role every 1.5 seconds

    return () => clearInterval(interval);
  }, [bio.roles.length, prefersReducedMotion]);

  return (
    <section id="about" className="relative z-10 min-h-screen flex items-center px-6 py-20">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left side - Introduction */}
          <div className="text-left order-2 lg:order-1">
            {/* Name with subtle glow effect */}
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-medium mb-6 tracking-tight">
              <span className="inline-block relative">
                Hey, I'm {bio.name}
                <span
                  className="absolute bottom-0 left-0 w-full h-0.25 bg-[#d4c5a9] opacity-50"
                  aria-hidden="true"
                />
              </span>
            </h1>

            {/* Animated roles with smooth crossfade */}
            <div className="relative h-10 md:h-10 mb-4 overflow-hidden">
              {bio.roles.map((role, index) => (
                <p
                  key={role}
                  className={`absolute inset-0 flex items-start font-display text-xl md:text-2xl text-[#d4c5a9] transition-opacity duration-700 ${
                    index === roleIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {role}
                </p>
              ))}
            </div>

            {/* Bio */}
            <p className="text-gray-400 leading-relaxed mb-10 max-w-lg">
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
                className="px-8 py-3 border-2 border-[#d4c5a9] rounded font-display text-sm tracking-wide text-center
                         hover:bg-[#d4c5a9] hover:text-black hover:shadow-glow transition-all duration-300
                         focus:outline-none focus:ring-2 focus:ring-[#d4c5a9] focus:ring-offset-2 focus:ring-offset-[#050509]"
              >
                VIEW RESUME
              </a>
              <a
                href={bio.github}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border border-[#202029] rounded font-display text-sm tracking-wide text-center
                         hover:border-[#d4c5a9] hover:text-[#d4c5a9] transition-all duration-300
                         focus:outline-none focus:ring-2 focus:ring-[#d4c5a9] focus:ring-offset-2 focus:ring-offset-[#050509]"
              >
                GITHUB
              </a>
              <a
                href={bio.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border border-[#202029] rounded font-display text-sm tracking-wide text-center
                         hover:border-[#d4c5a9] hover:text-[#d4c5a9] transition-all duration-300
                         focus:outline-none focus:ring-2 focus:ring-[#d4c5a9] focus:ring-offset-2 focus:ring-offset-[#050509]"
              >
                LINKEDIN
              </a>
            </div>

            {/* Scroll indicator */}
            <div className="mt-16">
              <a
                href="#experience"
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#d4c5a9] transition-colors group"
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
              </a>
            </div>
          </div>

          {/* Right side - Tesseract Animation */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <div className="w-40 md:w-96 lg:w-full max-w-2xl aspect-square relative">
              <div className="absolute inset-30 bg-gradient-to-br from-[#d4c5a9]/10 to-transparent rounded-xl blur-2xl" />
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
