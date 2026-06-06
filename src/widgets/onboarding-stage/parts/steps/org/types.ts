import type { WizardData } from '../../wizard';

export type OrgStepProps = {
  value: WizardData['org'];
  onChange: (v: WizardData['org']) => void;
};
