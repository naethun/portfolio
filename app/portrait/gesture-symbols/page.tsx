import { JetBrains_Mono } from 'next/font/google';
import { GestureSymbolsExperience } from '@/components/GestureSymbols/GestureSymbolsExperience';
import { PortraitModeShell } from '../_components/PortraitModeShell';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'PORTRAIT · gesture symbols',
};

export default function PortraitGestureSymbolsPage() {
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} flex min-h-screen w-full items-center justify-center bg-white`}
    >
      <PortraitModeShell>
        <GestureSymbolsExperience />
      </PortraitModeShell>
    </main>
  );
}
