import type { PullRequest } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import LeftQueue, { type QueueScope } from '../ui/LeftQueue';
import { EngineFindingsPanel } from '../ui/ReviewShellChrome';
import { SEV } from '../lib/severityColors';

type Props = {
  prs: PullRequest[];
  repo: RepoData;
  activePr: PullRequest | null;
  setActivePr: (n: number) => void;
  viewerLogin: string;
  query: string;
  onQueryChange: (q: string) => void;
  scope: QueueScope;
  onScopeChange: (s: QueueScope) => void;
  onJumpToFindings: () => void;
};

// LEFT — queue cockpit + active-PR engine findings.
// Findings panel sits *above* the queue: Fitts's law + "blocker info
// before reading code" — a reviewer who just picked a PR sees its
// blockers without scrolling. Collapses when no PR is active so the
// queue keeps full height.
export default function QueuePanel({
  prs, repo, activePr, setActivePr, viewerLogin,
  query, onQueryChange, scope, onScopeChange, onJumpToFindings,
}: Props) {
  return (
    <aside
      className="shrink-0 w-[296px] flex flex-col border-r border-[var(--border-muted)]"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      {activePr !== null && (
        <EngineFindingsPanel
          pr={activePr}
          repo={repo}
          onJumpToFinding={onJumpToFindings}
          severityColors={SEV}
        />
      )}
      <LeftQueue
        prs={prs}
        repo={repo}
        activePrNumber={activePr?.number ?? null}
        setActivePr={setActivePr}
        viewerLogin={viewerLogin}
        query={query}
        onQueryChange={onQueryChange}
        scope={scope}
        onScopeChange={onScopeChange}
      />
    </aside>
  );
}
