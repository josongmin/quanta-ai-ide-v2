import { useTheme } from '@shared/theme';
import { useFilterStore } from '@entities/filter-state';
import {
  useActivityStore,
  type AiActivity, type ActivityState, type ActivityTarget, type ActivityAction,
} from '../model/activityStore';

// Fixed-position floating tray that lists every active AI session and what
// each session is doing per file. The textual readout is always-on; the rings
// on the dot field are decorative reinforcement.

export function ActivityTray() {
  const { isDark } = useTheme();
  const enabled = useActivityStore((s) => s.prefs.enabled);
  const activities = useActivityStore((s) => s.activities);
  const repo = useFilterStore((s) => s.repo);

  if (!enabled || activities.length === 0) return null;

  return (
    <div
      className="fixed left-4 bottom-4 z-30 max-w-[320px] flex flex-col gap-1.5 pointer-events-none"
      aria-live="polite"
    >
      {activities.map((a) => (
        <ActivityCard
          key={a.chatId}
          activity={a}
          isDark={isDark}
          targets={a.targets.map((t) => ({
            target: t,
            fileName: repo.files[t.fileId]?.name ?? `#${t.fileId.toString()}`,
          }))}
        />
      ))}
    </div>
  );
}

function ActivityCard({
  activity, isDark, targets,
}: {
  activity: AiActivity;
  isDark: boolean;
  targets: { target: ActivityTarget; fileName: string }[];
}) {
  const { hue, chatId, agent, task, state } = activity;
  const fill = isDark ? 'rgba(13,17,23,0.88)' : 'rgba(255,255,255,0.94)';
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border shadow-lg ${
        isDark ? 'border-white/10 text-white/85 backdrop-blur-md' : 'border-black/10 text-black/85'
      }`}
      style={{ background: fill, borderLeftWidth: 3, borderLeftColor: hue }}
    >
      {/* Header: agent + chat id + state */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: hue, boxShadow: `0 0 6px ${hue}` }}
        />
        <span style={{ color: hue }}>{agent}</span>
        <span className={isDark ? 'text-white/30' : 'text-black/30'}>·</span>
        <span className={isDark ? 'text-white/40' : 'text-black/40'}>{chatId}</span>
        <span className="ml-auto"><StateBadge state={state} isDark={isDark} /></span>
      </div>

      {/* Task summary */}
      <div className={`mt-1 text-[11px] leading-snug ${isDark ? 'text-white/70' : 'text-black/70'}`}>
        {task}
      </div>

      {/* Per-file actions */}
      <div className={`mt-1.5 pt-1.5 border-t space-y-1 ${
        isDark ? 'border-white/10' : 'border-black/10'
      }`}>
        {targets.slice(0, 4).map(({ target, fileName }) => (
          // Composite key — multiple targets can share a fileId when an
          // agent works on two symbols in the same file, so we fold action
          // and symbol in to keep keys stable across reorders.
          <TargetRow
            key={`${target.fileId}:${target.action}:${target.symbol ?? ''}`}
            target={target}
            fileName={fileName}
            isDark={isDark}
            hue={hue}
          />
        ))}
        {targets.length > 4 && (
          <div className={`text-[9px] italic ${isDark ? 'text-white/40' : 'text-black/40'}`}>
            +{(targets.length - 4).toString()} more
          </div>
        )}
      </div>
    </div>
  );
}

function TargetRow({
  target, fileName, isDark, hue,
}: { target: ActivityTarget; fileName: string; isDark: boolean; hue: string }) {
  const verbColor = ACTION_HUES[target.action] ?? hue;
  return (
    <div className="text-[10px] leading-snug">
      <div className="flex items-baseline gap-1.5">
        <span className="font-bold uppercase tracking-[0.18em] text-[9px]" style={{ color: verbColor }}>
          {target.action}
        </span>
        <span className={`font-mono truncate ${isDark ? 'text-white/85' : 'text-black/85'}`}>
          {target.symbol ?? fileName}
        </span>
      </div>
      <div className={`pl-[42px] truncate ${isDark ? 'text-white/40' : 'text-black/40'}`}>
        {target.intent}
        {target.symbol && <span className="ml-1 opacity-60">· {fileName}</span>}
      </div>
    </div>
  );
}

function StateBadge({ state, isDark }: { state: ActivityState; isDark: boolean }) {
  const label = state === 'thinking' ? 'thinking' : state === 'editing' ? 'editing' : 'done';
  const opacity = state === 'done' ? 0.5 : 1;
  return (
    <span
      className={`text-[9px] font-mono ${isDark ? 'text-white/55' : 'text-black/55'}`}
      style={{ opacity }}
    >
      {label}
    </span>
  );
}

// Verb hues — kept distinct from severity colors. Used only for the action
// label (4-letter all-caps), so the tray stays calm.
const ACTION_HUES: Record<ActivityAction, string> = {
  reading:     '#9ca3af',
  analyzing:   '#a5b4fc',
  editing:     '#22d3ee',
  refactoring: '#60a5fa',
  testing:     '#34d399',
  reviewing:   '#fbbf24',
  fixing:      '#f87171',
  documenting: '#c4b5fd',
};
