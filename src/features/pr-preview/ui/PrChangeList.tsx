import { Plus, Pencil, Minus, Waves, type LucideIcon } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { GlassCard } from '@shared/ui';
import { useFilterStore } from '@features/filter-files';
import { useStack } from '@features/inspect-target';
import { usePrPreview } from '../model/usePrPreview';
import type { FileRecord, PRChangeKind } from '@entities/repo';

const KIND_COLOR: Record<PRChangeKind, string> = {
  added:    '#5fa86c',
  modified: '#a8893a',
  deleted:  '#c25a55',
};

const KIND_ICON: Record<PRChangeKind, LucideIcon> = {
  added:    Plus,
  modified: Pencil,
  deleted:  Minus,
};

const RIPPLE_CAP = 20;

export default function PrChangeList() {
  const { isDark } = useTheme();
  const { active, diff } = usePrPreview();
  const repo = useFilterStore((s) => s.repo);
  const { open } = useStack();

  if (!active || !diff) return null;

  const openFile = (id: number) => { open({ kind: 'file', id }); };
  const files = repo.files;
  const ripple = diff.affected;
  const rippleVisible = ripple.slice(0, RIPPLE_CAP);
  const rippleHidden = Math.max(0, ripple.length - RIPPLE_CAP);

  return (
    <GlassCard className="p-2 max-h-[60vh] overflow-y-auto">
      <SectionLabel isDark={isDark} text="Changes" count={diff.changes.length} />
      <div className="flex flex-col gap-0.5 mb-2">
        {diff.changes.map((ch) => {
          const f = files[ch.id];
          if (!f) return null;
          return (
            <ChangeRow
              key={`c-${ch.id}`}
              isDark={isDark}
              file={f}
              kind={ch.kind}
              onClick={() => { openFile(ch.id); }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <Waves
          className={`w-3 h-3 ${isDark ? 'text-white/40' : 'text-black/40'}`}
          aria-hidden="true"
        />
        <SectionLabel isDark={isDark} text="Ripple" count={ripple.length} inline />
      </div>
      {ripple.length === 0 ? (
        <div
          className={`px-1 py-1 text-[10px] ${isDark ? 'text-white/40' : 'text-black/40'}`}
        >
          No transitive impact.
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {rippleVisible.map((id) => {
            const f = files[id];
            if (!f) return null;
            return (
              <ChangeRow
                key={`a-${id}`}
                isDark={isDark}
                file={f}
                kind={null}
                onClick={() => { openFile(id); }}
              />
            );
          })}
          {rippleHidden > 0 && (
            <div
              className={`px-2 py-1 text-[10px] font-mono ${
                isDark ? 'text-white/40' : 'text-black/40'
              }`}
            >
              +{rippleHidden} more
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function SectionLabel({
  isDark, text, count, inline = false,
}: {
  isDark: boolean;
  text: string;
  count: number;
  inline?: boolean;
}) {
  return (
    <div
      className={`${inline ? '' : 'mb-1.5 px-1'} flex items-baseline gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${
        isDark ? 'text-white/40' : 'text-black/40'
      }`}
    >
      <span>{text}</span>
      <span className={`tabular-nums ${isDark ? 'text-white/30' : 'text-black/30'}`}>
        {count}
      </span>
    </div>
  );
}

function ChangeRow({
  isDark, file, kind, onClick,
}: {
  isDark: boolean;
  file: FileRecord;
  kind: PRChangeKind | null;
  onClick: () => void;
}) {
  const color = kind ? KIND_COLOR[kind] : (isDark ? '#ffffff55' : '#00000055');
  const Icon = kind ? KIND_ICON[kind] : null;
  const folder = file.folderPath.split('.').join('/');
  return (
    <button
      type="button"
      onClick={onClick}
      title={kind ?? 'rippled'}
      className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
        isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]'
      }`}
    >
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 shrink-0"
        style={{ color }}
        aria-hidden="true"
      >
        {Icon
          ? <Icon className="w-3 h-3" />
          : <span className="w-1 h-1 rounded-full" style={{ background: color }} />}
      </span>
      <span
        className={`text-[11px] font-bold font-mono truncate ${
          isDark ? 'text-white/85' : 'text-black/85'
        }`}
      >
        {file.name}
      </span>
      <span
        className={`text-[9px] font-mono truncate ${
          isDark ? 'text-white/40' : 'text-black/40'
        }`}
      >
        {folder}
      </span>
    </button>
  );
}
