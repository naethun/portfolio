import { ReelsModeShell } from './ReelsModeShell';
import { ReelsStageWindow } from './ReelsStageWindow';
import { ReelsWindowMode } from './ReelsWindowMode';

export function ReelsWindowClient() {
  return (
    <ReelsModeShell>
      <ReelsStageWindow
        slot="full"
        title="camera"
        contentClassName="relative min-h-0 flex-1 bg-black"
      >
        <ReelsWindowMode />
      </ReelsStageWindow>
    </ReelsModeShell>
  );
}
