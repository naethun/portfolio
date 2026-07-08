import { JetBrains_Mono } from 'next/font/google';
import { PortraitFitScanMode } from '../_components/PortraitFitScanMode';
import { PortraitModeShell } from '../_components/PortraitModeShell';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'PORTRAIT · fit-scan mode',
};

export default function PortraitFitScanPage() {
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} flex min-h-screen w-full items-center justify-center bg-white`}
    >
      <PortraitModeShell>
        <PortraitFitScanMode />
      </PortraitModeShell>
    </main>
  );
}
