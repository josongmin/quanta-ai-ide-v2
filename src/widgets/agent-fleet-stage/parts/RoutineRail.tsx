import { useMemo, useState } from 'react';
import {
  Activity, Bot, Brush, FlaskConical, GitPullRequest, Pause, Pencil, Plus,
  Search as SearchIcon, Sparkles, Wrench, Zap,
} from 'lucide-react';
import type { Routine, RoutineKind, RoutineStatus } from './types';
import { relativeUntilMs } from './data';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

const KIND_ICON: Record<RoutineKind, typeof Bot> = {
  'quality-sweeper': Brush,
  'dead-code': Wrench,
  'flaky-tests': FlaskConical,
  'dep-caretaker': GitPullRequest,
  'perf-hunter': Activity,
  'docs-drift': Pencil,
};

export function RoutineRail({
  routines,
  activeId,
  onSelect,
  onNew,
  isDark,
  t,
  width = 304,
}: {
  routines: Routine[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isDark: boolean;
  t: TranslateFn;
  width?: number;
}) {
  const [filter, setFilter] = useState<'all' | RoutineStatus>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return routines.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (q !== '' && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [routines, filter, query]);

  const panel = isDark ? 'bg-[#11161e]' : 'bg-white';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';
  const textMuted = isDark ? 'text-white/55' : 'text-black/55';

  return (
    <aside
      className={`shrink-0 flex flex-col ${panel} border-r ${border}`}
      style={{ width }}
    >
      <div className={`shrink-0 h-12 flex items-center justify-between px-4 border-b ${border}`}>
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
          {t('rail.title')}
        </span>
        <button
          type="button"
          onClick={onNew}
          className={`p-1 rounded-md transition-colors ${
            isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.04]'
          }`}
          aria-label={t('header.newRoutine')}
          title={t('header.newRoutine')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={`shrink-0 px-3 py-2 border-b ${border} space-y-2`}>
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${
          isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-black/[0.02] border border-black/[0.06]'
        }`}>
          <SearchIcon className={`w-3 h-3 shrink-0 ${textFaint}`} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            placeholder={t('rail.search')}
            className={`flex-1 bg-transparent outline-none text-[12px] font-mono ${
              isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/85 placeholder:text-black/35'
            }`}
          />
        </div>
        <div className={`flex items-center gap-px rounded-md p-px ${
          isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
        }`}>
          {(['all', 'active', 'paused', 'draft'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); }}
              aria-pressed={filter === f}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                filter === f
                  ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black')
                  : (isDark ? 'text-white/45 hover:text-white/75' : 'text-black/45 hover:text-black/75')
              }`}
            >
              {t(`rail.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        {visible.length === 0 ? (
          <div className={`px-4 py-8 text-center text-[11px] ${textMuted}`}>
            {t('rail.empty')}
          </div>
        ) : (
          <ul className="py-1">
            {visible.map((r) => (
              <RoutineRow
                key={r.id}
                routine={r}
                active={r.id === activeId}
                onClick={() => { onSelect(r.id); }}
                isDark={isDark}
                t={t}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function RoutineRow({
  routine, active, onClick, isDark, t,
}: {
  routine: Routine;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const Icon = KIND_ICON[routine.kind] ?? Bot;
  const baseTone = isDark
    ? (active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]')
    : (active ? 'bg-black/[0.04]' : 'hover:bg-black/[0.02]');
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/45' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';

  const statusDot =
    routine.status === 'active' ? 'bg-[color:var(--intent-success-vivid)]'
    : routine.status === 'paused' ? 'bg-[color:var(--intent-warn-vivid)]'
    : (isDark ? 'bg-white/25' : 'bg-black/25');

  const nextLabel = routine.trigger.kind === 'manual'
    ? t('rail.noNextFire')
    : routine.nextFireAtMs != null
      ? t('rail.nextFire', { when: relativeUntilMs(routine.nextFireAtMs) })
      : t('rail.noNextFire');

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-3 py-2 transition-colors ${baseTone}`}
      >
        <div className="flex items-start gap-2">
          <span className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md mt-0.5 ${
            isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]'
          }`}>
            <Icon className={`w-3.5 h-3.5 ${muted}`} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${statusDot} ${routine.status === 'active' ? 'animate-pulse' : ''}`} />
              <span className={`text-[12px] font-semibold truncate ${heading}`}>{routine.name}</span>
            </div>
            <div className={`text-[10px] font-mono truncate ${faint} mb-1`}>
              {nextLabel}
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-mono tabular-nums ${muted}`}>
              <span className="flex items-center gap-1" title={t('metrics.successRate')}>
                <Sparkles className="w-2.5 h-2.5 opacity-70" />
                {Math.round(routine.metrics.successRate * 100)}%
              </span>
              <span className={faint}>·</span>
              <span title={t('metrics.netLoc')}>
                {routine.metrics.netLocDelta > 0 ? '+' : ''}{routine.metrics.netLocDelta}
              </span>
              <span className={faint}>·</span>
              <span className="flex items-center gap-1" title={t('metrics.spent')}>
                <Zap className="w-2.5 h-2.5 opacity-70" />
                ${routine.metrics.spentUsd.toFixed(2)}
              </span>
            </div>
          </div>
          {routine.status === 'paused' && (
            <Pause className={`w-3 h-3 shrink-0 mt-1 ${faint}`} />
          )}
        </div>
      </button>
    </li>
  );
}
