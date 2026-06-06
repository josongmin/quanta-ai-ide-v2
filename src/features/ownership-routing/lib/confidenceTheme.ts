export type ConfidenceTone = {
  fg: string;
  bg: string;
  vivid: string;
  label: string;
}

export function confidenceTone(value: number): ConfidenceTone {
  if (value >= 0.7) {
    return {
      fg: 'var(--intent-success-fg)',
      bg: 'var(--intent-success-bg)',
      vivid: 'var(--intent-success-vivid)',
      label: 'High',
    };
  }
  if (value >= 0.4) {
    return {
      fg: 'var(--intent-warn-fg)',
      bg: 'var(--intent-warn-bg)',
      vivid: 'var(--intent-warn-vivid)',
      label: 'Medium',
    };
  }
  return {
    fg: 'var(--intent-danger-fg)',
    bg: 'var(--intent-danger-bg)',
    vivid: 'var(--intent-danger-vivid)',
    label: 'Low',
  };
}
