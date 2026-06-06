// Shared types for the Super-admin page parts.

export type Plan = 'free' | 'team' | 'business' | 'enterprise';
export type Org = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  members: number;
  spend: number;
  signedUp: string;
};

export type UserStatus = 'active' | 'invited' | 'suspended';
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  org: string;
  lastSignIn: string;
  status: UserStatus;
};

export type JobState = 'running' | 'queued' | 'failed' | 'completed';
export type Job = {
  id: string;
  type: string;
  state: JobState;
  runtime: string;
  retries: number;
  payload: string;
};

export type Flag = {
  id: string;
  description: string;
  rollout: number;
  enabled: boolean;
  acmeForced: boolean;
};
