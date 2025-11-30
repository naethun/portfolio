'use client';

import { useState } from 'react';
import { Bio } from '@/lib/data';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { href: '#about', label: 'ABOUT' },
  { href: '#experience', label: 'EXPERIENCE' },
  { href: '#education', label: 'EDUCATION' },
  { href: '#projects', label: 'PROJECTS' },
];

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-background-primary/80 border-b border-border-primary" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <a
            href="#"
            className="font-display text-xl font-bold tracking-wide hover:text-accent-primary transition-colors"
          >
            {Bio.name.toUpperCase()}
          </a>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex gap-8 items-center">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm font-display tracking-wide hover:text-accent-primary transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
            {/* Social Links */}
            <li>
              <a
                href={Bio.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-display text-accent-primary tracking-wide hover:text-accent-secondary transition-colors"
                aria-label="GitHub Profile"
              >
                GITHUB
              </a>
            </li>
            <li>
              <a
                href={Bio.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-display text-accent-primary tracking-wide hover:text-accent-secondary transition-colors"
                aria-label="LinkedIn Profile"
              >
                LINKEDIN
              </a>
            </li>
            {/* Theme Toggle */}
            <li>
              <ThemeToggle />
            </li>
          </ul>

          {/* Mobile Hamburger Button */}
          <button
            className="md:hidden flex flex-col gap-1.5 w-6 h-6 justify-center items-center group"
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <span
              className={`w-full h-0.5 bg-current transition-all duration-300 ${
                isMenuOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            />
            <span
              className={`w-full h-0.5 bg-current transition-all duration-300 ${
                isMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`w-full h-0.5 bg-current transition-all duration-300 ${
                isMenuOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border-primary">
            <ul className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={closeMenu}
                    className="block text-sm font-display tracking-wide hover:text-accent-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              {/* Mobile Social Links */}
              <li className="pt-2 border-t border-border-primary">
                <a
                  href={Bio.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="block text-sm font-display tracking-wide hover:text-accent-primary transition-colors"
                  aria-label="GitHub Profile"
                >
                  GITHUB
                </a>
              </li>
              <li>
                <a
                  href={Bio.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="block text-sm font-display tracking-wide hover:text-accent-primary transition-colors"
                  aria-label="LinkedIn Profile"
                >
                  LINKEDIN
                </a>
              </li>
              <li>
                <a
                  href={Bio.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="block text-sm font-display tracking-wide hover:text-accent-primary transition-colors"
                  aria-label="View Resume"
                >
                  RESUME
                </a>
              </li>
              {/* Mobile Theme Toggle */}
              <li className="pt-2 border-t border-border-primary flex justify-center">
                <ThemeToggle />
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
