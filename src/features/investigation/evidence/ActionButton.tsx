import type { CSSProperties, ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExternalLink,
  Search,
  Wrench,
  UserPlus,
  type LucideProps,
} from 'lucide-react';
import type { ActionKind, ActionRecommendation } from '@entities/investigation';

type Props = {
  action: ActionRecommendation;
  onRun?: (action: ActionRecommendation) => void;
};

const ICONS: Record<ActionKind, ComponentType<LucideProps>> = {
  open_focus: ExternalLink,
  run_deep_scan: Search,
  create_fix_task: Wrench,
  assign_owner: UserPlus,
};

export function ActionButton({ action, onRun }: Props) {
  const { t } = useTranslation('investigation');
  const Icon = ICONS[action.kind];
  const disabled = !action.enabled;
  const style: CSSProperties = {
    background: disabled ? 'var(--bg-surface-muted)' : 'var(--bg-active)',
    color: disabled ? 'var(--fg-muted)' : 'var(--fg-strong)',
    border: '1px solid var(--border-default)',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onRun && !disabled ? () => { onRun(action); } : undefined}
      title={disabled ? t('action.comingSoon') : (action.description ?? action.label)}
      style={style}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium"
    >
      <Icon size={12} aria-hidden="true" />
      <span>{action.label}</span>
    </button>
  );
}
