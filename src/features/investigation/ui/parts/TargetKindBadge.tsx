import { useTranslation } from 'react-i18next';
import { FileText, Bug, Code2 } from 'lucide-react';
import type { InvestigationTarget } from '@entities/investigation';

const TARGET_KIND_ICON: Record<InvestigationTarget['kind'], React.ComponentType<{ className?: string }>> = {
  file: FileText,
  symbol: Code2,
  incident: Bug,
};

export function TargetKindBadge({ kind }: { kind: InvestigationTarget['kind'] }) {
  const { t } = useTranslation('investigation');
  const Icon = TARGET_KIND_ICON[kind];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-2xs font-bold uppercase tracking-[0.16em] border"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <Icon className="w-3 h-3" />
      {t(`targetKind.${kind}`)}
    </span>
  );
}
