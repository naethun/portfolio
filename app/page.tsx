import { getUniverseMedia } from '@/lib/getUniverseMedia';
import { getShoppable } from '@/lib/shoppable/getShoppable';
import HomeClient from './HomeClient';

export default function Home() {
  const media = getUniverseMedia();
  const shoppable = getShoppable();
  return <HomeClient media={media} shoppable={shoppable} />;
}
