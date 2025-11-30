'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Project } from '@/types/portfolio';

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  // Split description into paragraphs
  const descriptionLines = project.description
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
          className="absolute inset-0 backdrop-blur-sm"
          style={{ backgroundColor: 'var(--modal-backdrop)' }}
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
            {/* Project Image */}
            <div className="relative h-54 md:h-94 w-full rounded-lg overflow-hidden mb-6 bg-background-primary">
              <Image
                src={project.image}
                alt={`${project.title} screenshot`}
                fill
                className="object-cover"
              />
              {/* Category badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 text-xs font-display tracking-wide bg-background-primary/90 backdrop-blur-sm border border-accent-primary rounded-full">
                  {project.category}
                </span>
              </div>
            </div>

            {/* Header */}
            <div className="mb-6">
              <h3
                id="modal-title"
                className="font-display text-2xl md:text-3xl font-bold mb-1"
              >
                {project.title}
              </h3>
              <p className="text-sm text-text-tertiary">{project.date}</p>
            </div>

            {/* Description */}
            <div className="space-y-3 text-text-secondary mb-6">
              {descriptionLines.map((line, index) => (
                <p key={index} className="text-sm leading-relaxed">
                  {line}
                </p>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-display tracking-wide
                           border border-border-primary rounded-full
                           bg-background-primary/50
                           hover:border-accent-primary/50 transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* GitHub Link */}
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2
                       border border-accent-primary rounded font-display text-sm tracking-wide
                       hover:bg-accent-primary hover:shadow-glow transition-all duration-300
                       focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-card"
              style={{
                color: 'var(--color-accent-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-bg-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-accent-primary)';
              }}
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              VIEW ON GITHUB
            </a>
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
