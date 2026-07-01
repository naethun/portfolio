import { getUniverseMedia } from '@/lib/getUniverseMedia';
import HomeClient from './HomeClient';

export default function Home() {
  const media = getUniverseMedia();
  return <HomeClient media={media} />;
}
