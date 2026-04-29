'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import Experience from '@/components/Experience';
import Education from '@/components/Education';
import Projects from '@/components/Projects';
import Footer from '@/components/Footer';

import { experiences, education, projects } from '@/lib/data';
import type { Tab } from '@/types/portfolio';
import type { LoopImage } from '@/lib/getLoopImages';

interface Props {
  loopImages: LoopImage[];
}

export default function HomeClient({ loopImages }: Props) {
  const [tab, setTab] = useState<Tab>('about');

  return (
    <>
      <Navigation activeTab={tab} onTabChange={setTab} />

      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'about' && <Hero images={loopImages} />}
            {tab === 'experience' && (
              <>
                <Experience experiences={experiences} />
                <Education education={education} />
              </>
            )}
            {tab === 'projects' && <Projects projects={projects} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </>
  );
}
