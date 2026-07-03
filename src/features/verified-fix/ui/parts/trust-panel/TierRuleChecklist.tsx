import { useTranslation } from '@shared/i18n';
import type { CandidateFix } from '../../../model/types';
import { useVfx } from '../tokens';

// Quantitative gate rules for safe-mechanical tier — exposed inline so
// reviewers can see why this candidate did or didn't qualify, instead
// of trusting an opaque label. Plan doc demands this be measurable.
export function TierRuleChecklist({ candidate }: { candidate: CandidateFix }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const allPass = candidate.obligations.every((o) => o.status === 'pass');
  const partial = candidate.obligations.some((o) => o.status === 'partial');
  const failing = candidate.obligations.some((o) => o.status === 'fail');

  const checks: { label: string; pass: boolean }[] = [
    { label: tr('trust.tierRule.lines'),       pass: candidate.changedLines <= 20 },
    { label: tr('trust.tierRule.files'),       pass: candidate.changedFiles <= 2 },
    { label: tr('trust.tierRule.blast'),       pass: candidate.blastModules <= 1 },
    { label: tr('trust.tierRule.noPublicApi'), pass: !candidate.publicApiChange },
    { label: tr('trust.tierRule.allProofs'),   pass: allPass && !partial && !failing },
  ];
  return (
    <ul className="space-y-0.5">
      {checks.map((c, i) => (
        <li
          key={i}
          className="flex items-center gap-1.5 text-xs font-mono"
          style={{ color: c.pass ? t.ok : t.textFaint }}
        >
          <span className="inline-block w-3 text-center">{c.pass ? '✓' : '·'}</span>
          <span>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}
