import { JetBrains_Mono } from 'next/font/google';
import { ReelsModeShell } from '../_components/ReelsModeShell';
import { ReelsWindowMode } from '../_components/ReelsWindowMode';

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
      <ReelsModeShell>
        <ReelsWindowMode />
      </ReelsModeShell>
    </main>
  );
}
