import type { PullRequest } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { ContextRail } from '../ui/ReviewContextRail';
import { RailEmpty } from '../ui/ReviewChromeBits';
import { SEV, TIER_COLOR } from '../lib/severityColors';
import type { ReviewTabKey } from '../ReviewStage';

type Props = {
  pr: PullRequest | null;
  repo: RepoData;
  sectionIds: Record<ReviewTabKey, string>;
  onJump: (t: ReviewTabKey) => void;
};

// RIGHT — context + actions.
export default function ContextPanel({
  pr, repo, sectionIds, onJump,
}: Props) {
  return (
    <aside
      className="shrink-0 w-[300px] flex flex-col border-l border-[var(--border-muted)]"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      {pr === null ? (
        <RailEmpty />
      ) : (
        <ContextRail
          pr={pr}
          repo={repo}
          onJump={onJump}
          severityColors={SEV}
          tierColors={TIER_COLOR}
          sectionIds={sectionIds}
          sectionLabels={{
            [sectionIds.overview]: 'Overview',
            [sectionIds.insights]: 'Findings',
            [sectionIds.risk]: 'Risk',
            [sectionIds.files]: 'Files',
            [sectionIds.checks]: 'Checks',
            [sectionIds.activity]: 'Activity',
          }}
        />
      )}
    </aside>
  );
}
