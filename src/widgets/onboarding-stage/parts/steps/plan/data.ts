import type { WizardData } from '../../wizard';

export type Plan = {
  id: WizardData['plan']['id'];
  monthly: number | null;
  annual: number | null;
  // i18n key stems for feature highlights — t(`plan.highlights.${k}`).
  highlightKeys: string[];
  recommended?: boolean;
  trial?: number;            // days
  minSeats?: number;
};

export const PLANS: Plan[] = [
  { id: 'free',       monthly: 0,    annual: 0,    highlightKeys: ['oneWorkspace', 'upTo3Seats', 'communitySupport'] },
  { id: 'team',       monthly: 24,   annual: 20,   highlightKeys: ['fiveWorkspaces', 'unlimitedSeats', 'customAdmission'], recommended: true, trial: 14, minSeats: 3 },
  { id: 'business',   monthly: 64,   annual: 54,   highlightKeys: ['unlimitedWorkspaces', 'samlScim', 'priorityRouting'],     trial: 14, minSeats: 10 },
  { id: 'enterprise', monthly: null, annual: null, highlightKeys: ['vpcSelfHost', 'customSla', 'dedicatedCsm'] },
];

export type Addon = {
  id: keyof WizardData['plan']['addons'];
  monthlyPerSeat: number;
  availableOn: WizardData['plan']['id'][];
};

// label/sub resolved via t(`plan.addonList.${id}Label` / `${id}Sub`).
export const ADDONS: Addon[] = [
  { id: 'sso',       monthlyPerSeat: 8,  availableOn: ['team', 'business', 'enterprise'] },
  { id: 'auditPro',  monthlyPerSeat: 6,  availableOn: ['business', 'enterprise'] },
  { id: 'premium',   monthlyPerSeat: 12, availableOn: ['team', 'business', 'enterprise'] },
];
