// Single source of truth for the wizard step list + the data shape the
// wizard collects. Each step writes into its own slice; the shell just
// passes the slice to the step component.

import type { OnboardingStep } from './OnboardingShell';

export const STEPS: OnboardingStep[] = [
  {
    id: 'profile',
    label: 'Profile',
    title: 'Set up your profile',
    subtitle: 'How others on your team will see you in reviews and mentions.',
  },
  {
    id: 'org',
    label: 'Organization',
    title: 'Create or join an organization',
    subtitle: 'Workspaces, teams, and billing roll up here.',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    title: 'Connect your first workspace',
    subtitle: 'Pick the repo (or monorepo) you want se · field to start indexing.',
  },
  {
    id: 'invite',
    label: 'Invite',
    title: 'Invite teammates (optional)',
    subtitle: 'They can sign in with the same SSO domain. You can do this later.',
  },
  {
    id: 'plan',
    label: 'Plan',
    title: 'Pick a plan to start with',
    subtitle: 'You can change or cancel any time. Annual saves 17%.',
  },
];

export type Industry =
  | 'software' | 'finance' | 'healthcare' | 'retail' | 'media'
  | 'gov-edu' | 'manufacturing' | 'other';

export type CompanySize = '1-4' | '5-19' | '20-99' | '100-499' | '500+';

export type InviteRole = 'admin' | 'member' | 'reviewer' | 'viewer';

export type InviteEntry = {
  email: string;
  role: InviteRole;
};

export type WizardData = {
  profile: {
    name: string;
    handle: string;
    timezone: string;
    locale: string;
    avatarUrl: string | null;     // object URL from upload
    avatarBlob: Blob | null;      // kept so we can revoke / re-encode if cropped
  };
  org: {
    mode: 'create' | 'join';
    name: string;
    slug: string;
    inviteCode: string;
    industry: Industry | '';
    size: CompanySize | '';
    logoUrl: string | null;
  };
  workspace: {
    provider: 'github' | 'gitlab' | 'bitbucket';
    connected: boolean;
    account: string;             // e.g. "acme" GitHub org
    repo: string;
    branch: string;
    monorepoPaths: string[];     // selected sub-paths if it's a monorepo
  };
  invite: {
    entries: InviteEntry[];
    inviteLink: string | null;
    sent: boolean;
  };
  plan: {
    id: 'free' | 'team' | 'business' | 'enterprise';
    cycle: 'monthly' | 'annual';
    seats: number;
    addons: { sso: boolean; auditPro: boolean; premium: boolean };
  };
};

export const INITIAL_DATA: WizardData = {
  profile: {
    name: '',
    handle: '',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    avatarUrl: null,
    avatarBlob: null,
  },
  org: {
    mode: 'create',
    name: '',
    slug: '',
    inviteCode: '',
    industry: '',
    size: '',
    logoUrl: null,
  },
  workspace: {
    provider: 'github',
    connected: false,
    account: '',
    repo: '',
    branch: '',
    monorepoPaths: [],
  },
  invite: {
    entries: [],
    inviteLink: null,
    sent: false,
  },
  plan: {
    id: 'team',
    cycle: 'annual',
    seats: 5,
    addons: { sso: false, auditPro: false, premium: false },
  },
};
