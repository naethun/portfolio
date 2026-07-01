import { JetBrains_Mono } from 'next/font/google';
import { getUniverseMedia } from '@/lib/getUniverseMedia';
import LoopClient from './LoopClient';

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
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable}`}
      style={{ background: '#f4f2ee' }}
    >
      <LoopClient media={media} />
    </main>
  );
}
