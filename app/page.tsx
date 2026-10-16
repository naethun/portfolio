import type { Viewport } from 'next';
import { getUniverseMedia } from '@/lib/getUniverseMedia';
import { getShoppable } from '@/lib/shoppable/getShoppable';
import HomeClient from './HomeClient';

// Browser chrome matches the desktop backdrop.
export const viewport: Viewport = {
  themeColor: '#e9e9e8',
};

export default function Home() {
  const media = getUniverseMedia();
  const shoppable = getShoppable();
  return <HomeClient media={media} shoppable={shoppable} />;
}
