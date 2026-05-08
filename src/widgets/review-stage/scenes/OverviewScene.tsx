// ─────────────────────────────────────────────────────────────────────────
// OVERVIEW SCENE — description, labels, suggested reviewers
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { GitPullRequest, Users } from 'lucide-react';
import {
  findPerson, suggestReviewers,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Avatar } from '@features/review-pr';
import { useTranslation } from '@shared/i18n';
import V2Card from '../ui/V2Card';
import SceneHeader from '../ui/SceneHeader';

export default function OverviewScene({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const { t } = useTranslation('review');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <V2Card className="p-5">
        <SceneHeader icon={GitPullRequest} title="Description" hint="markdown · author intent" />
        <div className="mt-3 text-[13px] leading-relaxed text-white/85 whitespace-pre-wrap break-words font-sans">
          {pr.description.trim().length === 0
            ? <span className="italic text-white/40">{t('empty.noDescription')}</span>
            : pr.description}
        </div>
        {pr.labels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {pr.labels.map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono bg-white/[0.04] border-white/10 text-white/70"
              >
                #{l}
              </span>
            ))}
          </div>
        )}
      </V2Card>

      <ReviewerSuggestionsCard pr={pr} repo={repo} />
    </div>
  );
}

function ReviewerSuggestionsCard({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const { t } = useTranslation('review');
  const suggestions = useMemo(() => suggestReviewers(pr, repo, 3), [pr, repo]);
  return (
    <V2Card className="p-5">
      <SceneHeader icon={Users} title={t('section.suggestedReviewers')} hint={t('section.suggestedReviewersHint')} />
      {suggestions.length === 0 ? (
        <div className="mt-3 text-[12px] italic text-white/40">{t('empty.noSuggestions')}</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => {
            const person = findPerson(s.login);
            const pct = Math.round(Math.max(0, Math.min(1, s.score)) * 100);
            return (
              <li key={s.login} className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/[0.025]">
                <Avatar login={s.login} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-white/85 truncate">{person.display}</span>
                    <span className="text-[10px] font-mono text-white/40">@{s.login}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/40 truncate">
                    {s.reasons.join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" title={`Match ${String(pct)}%`}>
                  <div className="h-[4px] w-[60px] rounded-full overflow-hidden bg-white/[0.08]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${String(pct)}%`,
                        background: '#4f9a5c',
                        boxShadow: 'none',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-white/55">{pct}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </V2Card>
  );
}
