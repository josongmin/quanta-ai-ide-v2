import type { WizardData } from '../../wizard';

export type WorkspaceStepProps = {
  value: WizardData['workspace'];
  onChange: (v: WizardData['workspace']) => void;
};
