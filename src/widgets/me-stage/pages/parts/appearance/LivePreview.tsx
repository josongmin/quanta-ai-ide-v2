import { Sparkles, Eye } from 'lucide-react';
import type { Appearance } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Live preview — fake review row + tiny code diff

export function LivePreview({ settings }: { settings: Appearance }) {
  const fontScale = settings.fontScale === 'sm' ? 0.85 : settings.fontScale === 'lg' ? 1.18 : 1;
  const rowGap = settings.density === 'compact' ? 6 : settings.density === 'roomy' ? 14 : 10;
  return (
    <div
      className="rounded-md p-4 flex flex-col"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
        gap: rowGap,
        fontSize: `${13 * fontScale}px`,
      }}
    >
      <div className="flex items-center gap-2 onb-stagger">
        <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          PR #4821 · Add admission rule for SSO-only prod
        </span>
        <span
          className="text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded ml-auto"
          style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', color: 'var(--fg-accent)' }}
        >
          Approved
        </span>
      </div>
      <span style={{ color: 'var(--fg-muted)' }}>
        Reviewed 4 files. 3 reviewers approved. Ready to merge once admission re-runs.
      </span>
      <pre
        className="rounded p-2 font-mono"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-muted)',
          fontSize: `${11 * fontScale}px`,
          color: 'var(--fg-default)',
          margin: 0,
        }}
      >
        <code>
          <span style={{ color: 'var(--intent-success-fg)' }}>+ allow:   sso</span>{'\n'}
          <span style={{ color: 'var(--intent-danger-fg)' }}>- enforce: false</span>{'\n'}
          <span>  match:</span>{'\n'}
          <span>    branch: main</span>
        </code>
      </pre>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-subtle)' }}>
        <Eye className="w-3 h-3" /> Preview rendered with your current selections
      </div>
    </div>
  );
}
