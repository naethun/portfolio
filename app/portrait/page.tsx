import { JetBrains_Mono } from 'next/font/google';
import { getUniverseMedia } from '@/lib/getUniverseMedia';
import { getShoppable } from '@/lib/shoppable/getShoppable';
import { PortraitModeShell } from './_components/PortraitModeShell';
import { PortraitUniverseMode } from './_components/PortraitUniverseMode';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'PORTRAIT · 3D image universe',
};

/**
 * The single-window portrait cut of the universe: a 9:16 frame rendering the
 * full `UniverseExperience` as-is (it manages its own camera via the little
 * draggable HUD + gesture button). Companion to the two-window `/reels` stage.
 */
export default function PortraitPage() {
  const media = getUniverseMedia();
  const shoppable = getShoppable();
  return (
    <main
      className={`${jetbrainsMono.className} ${jetbrainsMono.variable} flex min-h-screen w-full items-center justify-center bg-white`}
    >
      <PortraitModeShell>
        <PortraitUniverseMode media={media} shoppable={shoppable} />
      </PortraitModeShell>
    </main>
  );
}
