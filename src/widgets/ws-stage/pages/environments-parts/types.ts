export type Tier = 'production' | 'staging' | 'dev';
export type Region = 'us' | 'eu' | 'apac';
export type DeployStatus = 'success' | 'failure' | 'in_progress';

export type Deploy = {
  id: string;
  sha: string;
  status: DeployStatus;
  by: string;
  at: string;
  durationMs: number;
};

export type Environment = {
  id: string;
  name: string;
  tier: Tier;
  url: string;
  sha: string;
  deployedAt: string;
  region: Region;
  reviewers: number;
  blockDirectPush: boolean;
  promotesFrom: string;
  deploys: Deploy[];
};

export const REGION_LABELS: Record<Region, string> = {
  us:   'us-east-1',
  eu:   'eu-west-1',
  apac: 'apac-southeast-1',
};
