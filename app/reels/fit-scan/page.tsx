import { JetBrains_Mono } from 'next/font/google';
import { ReelsFitScanMode } from '../_components/ReelsFitScanMode';
import { ReelsModeShell } from '../_components/ReelsModeShell';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'REELS · fit-scan mode',
};

export default function ReelsFitScanPage() {
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} min-h-screen bg-white text-black`}
    >
      <ReelsModeShell>
        <div className="absolute inset-[8%]">
          <ReelsFitScanMode />
        </div>
      </ReelsModeShell>
    </main>
  );
}
