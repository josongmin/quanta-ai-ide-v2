import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import type { Staleness } from '@entities/investigation';

type Props = {
  staleness: Staleness;
};

// Tiny inline staleness label. Background uses surface-muted so the pill
// reads as chrome rather than a state banner; foreground colour and a
// small leading glyph carry the signal so it's scannable from a distance.
export function StalenessPill({ staleness }: Props) {
  const { t } = useTranslation('investigation');
  let label: string;
  let color: string;
  let glyph: ReactNode = null;
  switch (staleness) {
    case 'fresh':
      label = t('staleness.fresh');
      color = 'var(--intent-success-vivid)';
      glyph = (
        <span
          aria-hidden="true"
          style={{
            width: 3,
            height: 3,
            background: 'var(--intent-success-vivid)',
            borderRadius: '999px',
            display: 'inline-block',
          }}
        />
      );
      break;
    case 'stale':
      label = t('staleness.stale');
      color = 'var(--intent-warn-vivid)';
      glyph = <Clock size={9} aria-hidden="true" />;
      break;
    case 'unknown':
    default:
      label = t('staleness.unknown');
      color = 'var(--fg-subtle)';
      break;
  }
  const style: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    color,
    fontSize: '9px',
    lineHeight: 1,
    fontWeight: 600,
  };
  return (
    <span
      style={style}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
    >
      {glyph}
      {label}
    </span>
  );
}
