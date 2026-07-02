// Shared types for the Pricing page parts.

import type { PlanId } from '@entities/plan';

export type Cycle = 'monthly' | 'annual';

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  unit: string;
  cta: string;
  ctaPrimary?: boolean;
  featured?: boolean;
  features: string[];
};

export type Feature = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  cells: (boolean | string)[];
};
