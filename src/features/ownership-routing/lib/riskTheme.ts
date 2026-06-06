import type { RiskBadge } from '@entities/ownership';

export type RiskTone = {
  fg: string;
  bg: string;
  label: string;
}

export function riskTone(risk: RiskBadge): RiskTone {
  if (risk === 'low') {
    return {
      fg: 'var(--intent-success-fg)',
      bg: 'var(--intent-success-bg)',
      label: 'LOW RISK',
    };
  }
  if (risk === 'medium') {
    return {
      fg: 'var(--intent-warn-fg)',
      bg: 'var(--intent-warn-bg)',
      label: 'MED RISK',
    };
  }
  return {
    fg: 'var(--intent-danger-fg)',
    bg: 'var(--intent-danger-bg)',
    label: 'HIGH RISK',
  };
}
