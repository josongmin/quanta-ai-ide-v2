import { useTranslation } from 'react-i18next';
import type { ContextBundle } from '@entities/investigation';
import { SimilarIncidentCard } from './SimilarIncidentCard';
import { SimilarCodeCard } from './SimilarCodeCard';

type Props = { bundle: ContextBundle | null };

export function SimilarStrip({ bundle }: Props) {
  const { t } = useTranslation('investigation');
  if (!bundle) return null;
  const incidents = bundle.evidence.filter((e) => e.kind === 'similar_incident');
  const codes = bundle.evidence.filter((e) => e.kind === 'similar_code');
  if (incidents.length === 0 && codes.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div
        className="font-mono uppercase tracking-wider"
        style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
      >
        {t('similar.cases')}
      </div>
      <div className="flex flex-wrap gap-2">
        {incidents.map((ev) => (
          <SimilarIncidentCard key={ev.id} evidence={ev} />
        ))}
        {codes.map((ev) => (
          <SimilarCodeCard key={ev.id} evidence={ev} />
        ))}
      </div>
    </div>
  );
}
