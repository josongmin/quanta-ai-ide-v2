import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { FIXTURE_TARGETS, type InvestigationTarget } from '@entities/investigation';
import { FixtureRow } from './FixtureRow';

const KIND_ORDER: InvestigationTarget['kind'][] = ['file', 'symbol', 'incident'];

export function EmptyBody({ onPick }: { onPick: (target: InvestigationTarget) => void }) {
  const { t } = useTranslation('investigation');
  const grouped = KIND_ORDER
    .map((kind) => ({
      kind,
      items: FIXTURE_TARGETS.filter((t) => t.kind === kind),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col items-stretch text-left gap-3 py-2">
      <div className="flex flex-col items-center text-center gap-2 py-4">
        <Sparkles
          className="w-7 h-7"
          style={{ color: 'var(--intent-success-vivid)' }}
        />
        <div>
          <div
            className="text-base font-bold"
            style={{ color: 'var(--fg-default)' }}
          >
            {t('empty.title')}
          </div>
          <div
            className="text-xs mt-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('empty.subtitle')}
          </div>
        </div>
      </div>
      {grouped.map(({ kind, items }) => (
        <div key={kind}>
          <div
            className="text-2xs font-black uppercase tracking-eyebrow mb-1 px-0.5 flex items-center justify-between"
            style={{ color: 'var(--fg-muted)' }}
          >
            <span>{t(`empty.kind.${kind}`)}</span>
            <span style={{ color: 'var(--fg-subtle)' }}>{items.length.toString()}</span>
          </div>
          <div className="flex flex-col">
            {items.map((t) => (
              <FixtureRow key={t.id} target={t} onClick={() => { onPick(t); }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
