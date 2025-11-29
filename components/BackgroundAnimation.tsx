'use client';

import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function BackgroundAnimation() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      {/* Animated gradient orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Orb 1 - Top Left */}
        <div
          className={`absolute top-0 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 ${
            prefersReducedMotion ? '' : 'animate-float'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0) 70%)',
            animationDelay: '0s',
            animationDuration: '8s',
          }}
        />

        {/* Orb 2 - Top Right */}
        <div
          className={`absolute top-1/3 -right-1/4 w-72 h-72 rounded-full blur-3xl opacity-15 ${
            prefersReducedMotion ? '' : 'animate-float'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0) 70%)',
            animationDelay: '2s',
            animationDuration: '10s',
          }}
        />

        {/* Orb 3 - Bottom */}
        <div
          className={`absolute bottom-0 left-1/3 w-80 h-80 rounded-full blur-3xl opacity-25 ${
            prefersReducedMotion ? '' : 'animate-float'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
            animationDelay: '4s',
            animationDuration: '12s',
          }}
        />

        {/* Orb 4 - Center subtle */}
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-10 ${
            prefersReducedMotion ? '' : 'animate-float'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
            animationDelay: '6s',
            animationDuration: '14s',
          }}
        />
      </div>

      {/* Grain overlay */}
      <div className="grain-overlay" />
    </>
  );
}
