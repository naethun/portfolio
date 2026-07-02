import { JetBrains_Mono } from 'next/font/google';
import { getUniverseMedia } from '@/lib/getUniverseMedia';
import { getShoppable } from '@/lib/shoppable/getShoppable';
import ReelsClient from './ReelsClient';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'REELS · recording stage',
};

export default function ReelsPage() {
  const media = getUniverseMedia();
  const shoppable = getShoppable();
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} min-h-screen bg-white text-black`}
    >
      <ReelsClient media={media} shoppable={shoppable} />
    </main>
  );
}
