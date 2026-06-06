export type SecretScope = 'ci' | 'agents' | 'fix-pipeline' | 'webhooks';

export type Secret = {
  id: string;
  name: string;
  scopes: SecretScope[];
  lastRotated: string;        // ISO date
  lastAccessed: string;       // relative phrase
  expiresAt: string | null;   // ISO date or null
};

export const ALL_SCOPES: SecretScope[] = ['ci', 'agents', 'fix-pipeline', 'webhooks'];
