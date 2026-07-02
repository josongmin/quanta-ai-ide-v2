import type { RecentRepo } from './addTabData';
import { BadgeChip, BranchGlyph, DiffBar, Sparkline, StatusDot } from './RepoRowParts';

export function RepoRow({ repo }: { repo: RecentRepo }) {
  return (
    <div
      className="grid grid-cols-[28px_minmax(0,1.7fr)_minmax(0,1fr)_auto_64px] items-center gap-3 px-6 py-2.5 border-b"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div
        className="w-6 h-6 rounded inline-flex items-center justify-center text-[10px] font-semibold uppercase"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-muted)',
          color: 'var(--fg-default)',
        }}
      >
        {repo.slug.charAt(0)}
      </div>

      <div className="min-w-0">
        <div
          className="text-[12px] font-semibold truncate"
          style={{ color: 'var(--fg-default)' }}
        >
          {repo.slug}
        </div>
        {repo.quiet ? (
          <div
            className="text-[10px] italic mt-0.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            quiet
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {repo.diffAdded !== undefined ? (
              <DiffBar added={repo.diffAdded} removed={repo.diffRemoved ?? 0} />
            ) : null}
            {repo.badges?.map((b) => <BadgeChip key={b.label} badge={b} />)}
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-1.5 text-[10px] font-mono min-w-0"
        style={{ color: 'var(--fg-muted)' }}
      >
        <BranchGlyph />
        <span className="truncate">{repo.branch}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <Sparkline values={repo.sparkline} />
        <StatusDot status={repo.status} label={repo.statusLabel} />
      </div>

      <div
        className="text-[10px] font-mono whitespace-nowrap text-right"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {repo.lastTouched}
      </div>
    </div>
  );
}
