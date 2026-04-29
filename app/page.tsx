import { getLoopImages } from '@/lib/getLoopImages';
import HomeClient from './HomeClient';

export default function Home() {
  const loopImages = getLoopImages();
  return <HomeClient loopImages={loopImages} />;
}
