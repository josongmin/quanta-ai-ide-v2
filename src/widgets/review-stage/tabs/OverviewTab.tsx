import { useMemo } from 'react';
import { ShieldAlert, Lock, KeyRound, Tag, UserPlus, Users } from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import { findPerson, suggestReviewers } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Avatar } from '@features/review-pr';
import { useTranslation } from '@shared/i18n';
import { profileForPr, tierAccent, tierLabel } from '../lib/risk-shared';

type Props = {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
};

// Overview is the first thing a reviewer sees. We keep it scannable —
// description on top, the metadata chips below, then the risk profile
// card (which is the same component RiskTab expands), then a small
// reviewer-suggestion strip.
export default function OverviewTab({ pr, repo, isDark }: Props) {
  return (
    <div className="space-y-6">
      <DescriptionBlock pr={pr} isDark={isDark} />
      <LabelsBlock pr={pr} isDark={isDark} />
      <RiskProfileCard pr={pr} repo={repo} isDark={isDark} />
      <ReviewerSuggestionsBlock pr={pr} repo={repo} isDark={isDark} />
    </div>
  );
}

// ─── Description ─────────────────────────────────────────────────────────

function DescriptionBlock({ pr, isDark }: { pr: PullRequest; isDark: boolean }) {
  const { t } = useTranslation('review');
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const card = isDark
    ? 'bg-white/[0.04] border-white/10'
    : 'bg-white border-black/5';
  const body = pr.description.trim();
  return (
    <section className={`rounded-xl border ${card} p-4`}>
      <SectionLabel isDark={isDark}>Description</SectionLabel>
      {body.length === 0 ? (
        <div className={`text-[12px] italic ${muted}`}>{t('empty.noDescription')}</div>
      ) : (
        <pre className={`text-[12px] leading-relaxed font-sans whitespace-pre-wrap break-words ${fg}`}>
          {body}
        </pre>
      )}
    </section>
  );
}

function LabelsBlock({ pr, isDark }: { pr: PullRequest; isDark: boolean }) {
  if (pr.labels.length === 0) return null;
  const chip = isDark
    ? 'bg-white/[0.06] text-white/70 border-white/10'
    : 'bg-black/[0.04] text-black/70 border-black/10';
  return (
    <section>
      <SectionLabel isDark={isDark}>Labels</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {pr.labels.map((l) => (
          <span
            key={l}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono ${chip}`}
          >
            <Tag className="w-2.5 h-2.5" />
            {l}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── Risk profile card (also used by RiskTab) ───────────────────────────

export function RiskProfileCard({
  pr, repo, isDark,
}: {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
}) {
  const { t } = useTranslation('review');
  const profile = useMemo(() => profileForPr(pr, repo), [pr, repo]);

  const card = isDark
    ? 'bg-white/[0.04] border-white/10'
    : 'bg-white border-black/5';
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const accent = tierAccent(profile.tier);

  return (
    <section className={`rounded-xl border ${card} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel isDark={isDark}>{t('section.riskProfile')}</SectionLabel>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ background: `${accent}26`, color: accent }}
        >
          <ShieldAlert className="w-3 h-3" />
          {tierLabel(profile.tier)}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Blast sum"     value={String(profile.blastSum)}      isDark={isDark} />
        <Stat label="Public API"    value={String(profile.publicApiCount)} isDark={isDark} />
        <Stat label="Low safety"    value={String(profile.lowSafetyCount)} isDark={isDark} />
        <Stat label="SAST findings" value={String(profile.sastFindings)}   isDark={isDark} />
        <Stat
          label="Coverage"
          value={profile.avgCoverage === null ? '—' : `${(profile.avgCoverage * 100).toFixed(0)}%`}
          isDark={isDark}
        />
        <Stat
          label="Cyclic"
          value={String(profile.cyclicCount)}
          isDark={isDark}
        />
      </div>

      {profile.secretsRisk && (
        <div
          className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px]"
          style={{ background: '#c25a5520', color: '#c25a55' }}
        >
          <KeyRound className="w-3 h-3 shrink-0" />
          A changed file matched the secrets-likely heuristic. Treat with care.
        </div>
      )}

      {profile.reasons.length > 0 && (
        <div className="mt-3">
          <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${muted}`}>
            Why this score
          </div>
          <ul className={`mt-1 text-[12px] space-y-0.5 ${fg}`}>
            {profile.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span style={{ color: accent }}>•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.reasons.length === 0 && (
        <div className={`mt-3 flex items-center gap-2 text-[11px] ${muted}`}>
          <Lock className="w-3 h-3" />
          No risk signals tripped on the static-analysis side.
        </div>
      )}
    </section>
  );
}

function Stat({
  label, value, isDark,
}: { label: string; value: string; isDark: boolean }) {
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  return (
    <div>
      <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${muted}`}>{label}</div>
      <div className={`text-[18px] font-mono tabular-nums ${fg}`}>{value}</div>
    </div>
  );
}

// ─── Reviewer suggestions ───────────────────────────────────────────────

// Routed by the p0 engine's pseudo-blame router (see `suggestReviewers`):
// file-owner string × topic match × historic overlap. Deterministic per PR.
function ReviewerSuggestionsBlock({
  pr, repo, isDark,
}: { pr: PullRequest; repo: RepoData; isDark: boolean }) {
  const { t } = useTranslation('review');
  const suggestions = useMemo(() => suggestReviewers(pr, repo, 3), [pr, repo]);

  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const subtleMuted = isDark ? 'text-white/40' : 'text-black/40';
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  const trackBg = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]';
  const btnBorder = isDark
    ? 'border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/70'
    : 'border-black/15 hover:border-black/35 hover:bg-black/[0.03] text-black/70';

  return (
    <section className={`rounded-xl border ${card} p-4`}>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <SectionLabel isDark={isDark}>Suggested Reviewers</SectionLabel>
          <div className={`mt-1 text-[11px] ${subtleMuted}`}>
            Routed by p0 engine — file owners × topic match × historic overlap
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono shrink-0 ${muted}`}>
          <Users className="w-3 h-3" />
          p0 router
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className={`text-[12px] italic ${muted}`}>{t('empty.noSuggestionsShort')}</div>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((s) => {
            const person = findPerson(s.login);
            const reasons = s.reasons.join(' · ');
            const pct = Math.max(0, Math.min(1, s.score));
            return (
              <li
                key={s.login}
                className={`flex items-center gap-3 px-2 py-1.5 rounded-lg ${
                  isDark ? 'bg-white/[0.02]' : 'bg-black/[0.015]'
                }`}
              >
                <Avatar login={s.login} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-medium truncate ${fg}`}>
                      {person.display}
                    </span>
                    <span className={`text-[11px] font-mono ${subtleMuted}`}>
                      @{s.login}
                    </span>
                  </div>
                  {reasons.length > 0 && (
                    <div className={`mt-0.5 text-[11px] truncate ${subtleMuted}`}>
                      {reasons}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className="flex items-center gap-1.5"
                    aria-label={`Match score ${(pct * 100).toFixed(0)}%`}
                  >
                    <div className={`h-[4px] w-[60px] rounded-full overflow-hidden ${trackBg}`}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(pct * 100).toFixed(0)}%`,
                          background: '#4f9a5c',
                          boxShadow: '0 0 6px #4f9a5c55',
                        }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono tabular-nums ${muted}`}>
                      {(pct * 100).toFixed(0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Request review from ${s.login}`}
                    onClick={() => {
                      // TODO: wire to backend "request review" action when available.
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${btnBorder}`}
                  >
                    <UserPlus className="w-3 h-3" />
                    Request review
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SectionLabel({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  const color = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${color}`}>
      {children}
    </div>
  );
}
