import { JetBrains_Mono } from 'next/font/google';
import { GestureSymbolsExperience } from '@/components/GestureSymbols/GestureSymbolsExperience';
import { ReelsModeShell } from '../_components/ReelsModeShell';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'REELS · gesture symbols',
};

export default function ReelsGestureSymbolsPage() {
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} min-h-screen bg-white text-black`}
    >
      <ReelsModeShell>
        <GestureSymbolsExperience />
      </ReelsModeShell>
    </main>
  );
}
