export type ConfidenceTone = {
  fg: string;
  bg: string;
  vivid: string;
  /** i18n key (ownership namespace) — resolved by the rendering component. */
  labelKey: 'routing.confidenceLabel.high' | 'routing.confidenceLabel.medium' | 'routing.confidenceLabel.low';
}

export function confidenceTone(value: number): ConfidenceTone {
  if (value >= 0.7) {
    return {
      fg: 'var(--intent-success-fg)',
      bg: 'var(--intent-success-bg)',
      vivid: 'var(--intent-success-vivid)',
      labelKey: 'routing.confidenceLabel.high',
    };
  }
  if (value >= 0.4) {
    return {
      fg: 'var(--intent-warn-fg)',
      bg: 'var(--intent-warn-bg)',
      vivid: 'var(--intent-warn-vivid)',
      labelKey: 'routing.confidenceLabel.medium',
    };
  }
  return {
    fg: 'var(--intent-danger-fg)',
    bg: 'var(--intent-danger-bg)',
    vivid: 'var(--intent-danger-vivid)',
    labelKey: 'routing.confidenceLabel.low',
  };
}
