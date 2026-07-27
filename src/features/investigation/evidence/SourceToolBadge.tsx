import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { SourceTool } from '@entities/investigation';

type Props = {
  tool: SourceTool;
};

// Provenance label so a viewer can immediately see which static-analysis
// tool produced the evidence.
export function SourceToolBadge({ tool }: Props) {
  const { t } = useTranslation('investigation');
  const style: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '9px',
    lineHeight: 1,
  };
  return (
    <span
      title={t(`sourceTool.full.${tool}`)}
      style={style}
      className="inline-flex items-center font-mono uppercase tracking-wider"
    >
      {t(`sourceTool.short.${tool}`)}
    </span>
  );
}
