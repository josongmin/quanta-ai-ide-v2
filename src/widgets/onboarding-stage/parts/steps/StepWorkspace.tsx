import { ConnectScreen } from './workspace/ConnectScreen';
import { RepoPicker } from './workspace/RepoPicker';
import type { WorkspaceStepProps } from './workspace/types';

export function StepWorkspace({ value, onChange }: WorkspaceStepProps) {
  if (!value.connected) {
    return <ConnectScreen value={value} onChange={onChange} />;
  }
  return <RepoPicker value={value} onChange={onChange} />;
}
