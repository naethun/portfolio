import { JetBrains_Mono } from 'next/font/google';
import { getLoopImages } from '@/lib/getLoopImages';
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
  const images = getLoopImages();
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} min-h-screen bg-white text-black`}
    >
      <ReelsClient images={images} />
    </main>
  );
}
