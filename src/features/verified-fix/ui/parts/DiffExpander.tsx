import { ChevronDown, ChevronRight, FileCode2 } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { CandidateFix, DiffHunk } from '../../model/types';
import { useVfx } from './tokens';

export function DiffExpander({
  candidate, expanded, onToggle,
}: {
  candidate: CandidateFix | undefined;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');

  if (!candidate || candidate.diffPreview.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: t.cardBacking, borderColor: t.border }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 transition-colors hover:opacity-90"
        style={{ background: t.inset }}
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5" style={{ color: t.textMuted }} />
          : <ChevronRight className="w-3.5 h-3.5" style={{ color: t.textMuted }} />}
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: t.textMuted }}
        >
          {tr('diff.title')}
        </span>
        <span className="text-[10px] font-mono" style={{ color: t.textFaint }}>
          {candidate.diffSummary}
        </span>
        <span className="ml-auto text-[10px]" style={{ color: t.textFaint }}>
          {expanded ? tr('diff.collapse') : tr('diff.expand')}
        </span>
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {candidate.diffPreview.map((h, i) => (
            <DiffHunkView key={i} hunk={h} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiffHunkView({ hunk }: { hunk: DiffHunk }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  return (
    <div
      className="rounded border overflow-hidden"
      style={{ background: t.inset, borderColor: t.borderSoft }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 border-b"
        style={{ borderColor: t.borderSoft }}
      >
        <FileCode2 className="w-3 h-3" style={{ color: t.textFaint }} />
        <span className="text-[var(--fs-sm)] font-mono" style={{ color: t.textBody }}>
          {hunk.file}
        </span>
        <span className="text-[var(--fs-xs)] font-mono ml-auto" style={{ color: t.textFaint }}>
          {tr('diff.atLine', { line: hunk.startLine })}
        </span>
      </div>
      <div className="font-mono text-[11px] leading-[1.55]">
        {hunk.before.map((line, i) => (
          <div
            key={`b-${String(i)}`}
            className="px-3 py-px"
            style={{ background: t.badSoft, color: t.bad }}
          >
            <span className="inline-block w-3 opacity-60 mr-2">−</span>{line || ' '}
          </div>
        ))}
        {hunk.after.map((line, i) => (
          <div
            key={`a-${String(i)}`}
            className="px-3 py-px"
            style={{ background: t.okSoft, color: t.ok }}
          >
            <span className="inline-block w-3 opacity-60 mr-2">+</span>{line || ' '}
          </div>
        ))}
      </div>
    </div>
  );
}
