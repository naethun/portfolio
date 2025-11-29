import { Bio } from '@/lib/data';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-[#202029] bg-[#050509]/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Left side - Name and tagline */}
          <div className="text-center md:text-left">
            <p className="font-display text-lg font-bold tracking-wide mb-1">
              {Bio.name}
            </p>
            <p className="text-sm text-gray-400">
              Built with Next.js · {currentYear}
            </p>
          </div>

          {/* Right side - Social links */}
          <div className="flex gap-6">
            <a
              href={Bio.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-display tracking-wide hover:text-[#d4c5a9] transition-colors"
              aria-label="GitHub Profile"
            >
              GITHUB
            </a>
            <a
              href={Bio.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-display tracking-wide hover:text-[#d4c5a9] transition-colors"
              aria-label="LinkedIn Profile"
            >
              LINKEDIN
            </a>
            <a
              href={Bio.resume}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-display tracking-wide hover:text-[#d4c5a9] transition-colors"
              aria-label="View Resume"
            >
              RESUME
            </a>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-8 pt-6 border-t border-[#202029]/50 text-center">
          <p className="text-xs text-gray-500">
            © {currentYear} {Bio.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
