import { JetBrains_Mono } from 'next/font/google';
import { getLoopImages } from '@/lib/getLoopImages';
import LoopClient from './LoopClient';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'LOOP · interactive image gallery',
};

export default function LoopPage() {
  const images = getLoopImages();
  return (
    <main className={`${jetbrainsMono.className} ${jetbrainsMono.variable} bg-black text-white`}>
      <LoopClient images={images} />
    </main>
  );
}
