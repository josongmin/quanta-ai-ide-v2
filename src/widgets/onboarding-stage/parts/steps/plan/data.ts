import type { WizardData } from '../../wizard';

export type Plan = {
  id: WizardData['plan']['id'];
  name: string;
  monthly: number | null;
  annual: number | null;
  hint: string;
  highlights: string[];
  recommended?: boolean;
  trial?: number;            // days
  minSeats?: number;
};

export const PLANS: Plan[] = [
  { id: 'free',       name: 'Free',       monthly: 0,    annual: 0,    hint: 'Solo / exploring',     highlights: ['1 workspace', 'Up to 3 seats', 'Community support'] },
  { id: 'team',       name: 'Team',       monthly: 24,   annual: 20,   hint: 'For small teams',      highlights: ['5 workspaces', 'Unlimited seats', 'Custom admission rules'], recommended: true, trial: 14, minSeats: 3 },
  { id: 'business',   name: 'Business',   monthly: 64,   annual: 54,   hint: 'For organizations',    highlights: ['Unlimited workspaces', 'SAML / SCIM', 'Priority routing'],     trial: 14, minSeats: 10 },
  { id: 'enterprise', name: 'Enterprise', monthly: null, annual: null, hint: 'Regulated, self-host', highlights: ['VPC / self-host', 'Custom SLA', 'Dedicated CSM'] },
];

export type Addon = {
  id: keyof WizardData['plan']['addons'];
  label: string;
  sub: string;
  monthlyPerSeat: number;
  availableOn: WizardData['plan']['id'][];
};

export const ADDONS: Addon[] = [
  { id: 'sso',       label: 'SSO & SCIM',       sub: 'SAML 2.0 + provisioning',     monthlyPerSeat: 8,  availableOn: ['team', 'business', 'enterprise'] },
  { id: 'auditPro',  label: 'Audit Pro',        sub: '1y retention + SIEM export',  monthlyPerSeat: 6,  availableOn: ['business', 'enterprise'] },
  { id: 'premium',   label: 'Premium support',  sub: '4h SLA, dedicated channel',   monthlyPerSeat: 12, availableOn: ['team', 'business', 'enterprise'] },
];

export function labelFor(p: WizardData['plan']['id']) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}
