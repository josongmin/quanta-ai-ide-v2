import { useTheme } from '@shared/theme';

export type DiffMode = 'unified' | 'split';

type Props = {
  mode: DiffMode;
  onChange: (next: DiffMode) => void;
};

/**
 * Compact two-button segmented pill matching the look of
 * apply-overlay's HeatOverlayPicker pill (rounded-lg, soft surface,
 * stronger active state).
 */
export default function ModeToggle({ mode, onChange }: Props) {
  const { isDark } = useTheme();
  const trackCls = isDark
    ? 'bg-white/5 border-white/10'
    : 'bg-black/5 border-black/10';

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-lg border p-0.5 ${trackCls}`}>
      <Btn label="Unified" active={mode === 'unified'} isDark={isDark} onClick={() => { onChange('unified'); }} />
      <Btn label="Split"   active={mode === 'split'}   isDark={isDark} onClick={() => { onChange('split'); }} />
    </div>
  );
}

function Btn({
  label, active, isDark, onClick,
}: {
  label: string; active: boolean; isDark: boolean; onClick: () => void;
}) {
  const activeCls = isDark
    ? 'bg-white/15 text-white'
    : 'bg-black/10 text-black';
  const idleCls = isDark
    ? 'text-white/55 hover:bg-white/5'
    : 'text-black/55 hover:bg-black/5';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-[11px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md transition-colors ${
        active ? activeCls : idleCls
      }`}
    >
      {label}
    </button>
  );
}
