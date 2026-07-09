import { JetBrains_Mono } from 'next/font/google';
import { ReelsWindowClient } from '../_components/ReelsWindowClient';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'REELS · window mode',
};

export default function ReelsWindowPage() {
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} min-h-screen bg-white text-black`}
    >
      <ReelsWindowClient />
    </main>
  );
}
