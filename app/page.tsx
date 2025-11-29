import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import Skills from '@/components/Skills';
import Experience from '@/components/Experience';
import Education from '@/components/Education';
import Projects from '@/components/Projects';
import Footer from '@/components/Footer';

import { Bio, skills, experiences, education, projects } from '@/lib/data';

export default function Home() {
  return (
    <>
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative">
        <Hero bio={Bio} />
        <Skills skills={skills} />
        <Experience experiences={experiences} />
        <Education education={education} />
        <Projects projects={projects} />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
