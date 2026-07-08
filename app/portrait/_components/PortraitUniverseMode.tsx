import type { UniverseMedia } from '@/lib/getUniverseMedia';
import type { ShoppableManifest } from '@/lib/shoppable/types';
import UniverseExperience from '@/components/ImageUniverse/UniverseExperience';

export function PortraitUniverseMode({
  media,
  shoppable,
}: {
  media: UniverseMedia[];
  shoppable: ShoppableManifest;
}) {
  return (
    <UniverseExperience
      media={media}
      shoppable={shoppable}
      className="relative h-full w-full"
      hideGuidance
    />
  );
}
