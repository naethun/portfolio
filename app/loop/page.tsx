import { JetBrains_Mono } from 'next/font/google';
import { getUniverseMedia } from '@/lib/getUniverseMedia';
import { getShoppable } from '@/lib/shoppable/getShoppable';
import UniverseExperience from '@/components/ImageUniverse/UniverseExperience';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'LOOP · 3D image universe',
};

export default function LoopPage() {
  const media = getUniverseMedia();
  const shoppable = getShoppable();
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable}`}
      style={{ background: '#f4f2ee' }}
    >
      <UniverseExperience media={media} shoppable={shoppable} />
    </main>
  );
}
