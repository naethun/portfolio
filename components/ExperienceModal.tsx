'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from '@/hooks/useTheme';
import type { Experience } from '@/types/portfolio';

interface ExperienceModalProps {
  experience: Experience;
  onClose: () => void;
}

export default function ExperienceModal({ experience, onClose }: ExperienceModalProps) {
  const { resolvedTheme } = useTheme();

  // Split description into paragraphs
  const descriptionLines = experience.desc
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`absolute inset-0 backdrop-blur-sm ${resolvedTheme === 'dark' ? 'bg-black/80' : 'bg-black/40'}`}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto
                     bg-background-card/95 backdrop-blur-md border border-border-primary rounded-lg
                     shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center
                       rounded-full bg-background-primary/80 border border-border-primary
                       hover:border-accent-primary hover:bg-background-primary transition-all
                       group"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-text-tertiary group-hover:text-accent-primary transition-colors"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Modal Content */}
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden bg-[var(--color-image-bg)] p-2">
                <Image
                  src={experience.img}
                  alt={`${experience.company} logo`}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex-1">
                <h3
                  id="modal-title"
                  className="font-display text-2xl md:text-3xl font-bold mb-1"
                >
                  {experience.role}
                </h3>
                <p className="text-accent-primary font-display tracking-wide text-lg">
                  {experience.company}
                </p>
                <p className="text-sm text-text-tertiary mt-1">{experience.date}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 text-text-secondary mb-6">
              {descriptionLines.map((line, index) => (
                <p key={index} className="text-sm leading-relaxed">
                  {line}
                </p>
              ))}
            </div>

            {/* Skills Tags */}
            <div className="flex flex-wrap gap-2">
              {experience.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 text-xs font-display tracking-wide
                           border border-border-primary rounded-full
                           bg-background-primary/50
                           hover:border-accent-primary/50 transition-colors"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  // Use portal to render modal at document.body level
  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
