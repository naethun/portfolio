import { JetBrains_Mono } from 'next/font/google';
import { PortraitModeShell } from '../_components/PortraitModeShell';
import { PortraitWindowMode } from '../_components/PortraitWindowMode';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'PORTRAIT · window mode',
};

export default function PortraitWindowPage() {
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} flex min-h-screen w-full items-center justify-center bg-white`}
    >
      <PortraitModeShell>
        <PortraitWindowMode />
      </PortraitModeShell>
    </main>
  );
}
