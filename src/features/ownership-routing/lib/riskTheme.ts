import type { RiskBadge } from '@entities/ownership';

export type RiskTone = {
  fg: string;
  bg: string;
  /** i18n key (ownership namespace) — resolved by the rendering component. */
  labelKey: 'risk.low' | 'risk.medium' | 'risk.high';
}

export function riskTone(risk: RiskBadge): RiskTone {
  if (risk === 'low') {
    return {
      fg: 'var(--intent-success-fg)',
      bg: 'var(--intent-success-bg)',
      labelKey: 'risk.low',
    };
  }
  if (risk === 'medium') {
    return {
      fg: 'var(--intent-warn-fg)',
      bg: 'var(--intent-warn-bg)',
      labelKey: 'risk.medium',
    };
  }
  return {
    fg: 'var(--intent-danger-fg)',
    bg: 'var(--intent-danger-bg)',
    labelKey: 'risk.high',
  };
}
