import { useEffect, useMemo, useState } from 'react';
import { Bot, ChevronRight, X, Activity } from 'lucide-react';
import { useFilterRepo } from '@entities/filter-state';
import { GlassCard } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import { useActivityStore, type AiActivity } from '../model/activityStore';

// Live agent feed — a docked sidebar that turns the dot-field overlay
// from "pretty motion" into a *narrated* event stream. Each in-flight
// activity becomes a card naming the agent, the file it's touching,
// the action verb, and the intent. Toggle in the corner so the panel
// only shows when the user wants the play-by-play.
//
// The feed reads from the same activity store the overlay uses, so
// turning on demo mode populates both surfaces from the same source —
// users see the dot-field motion *and* the explanation.

const ACTION_VERB: Record<string, string> = {
  reading:     'Reading',
  analyzing:   'Analyzing',
  editing:     'Editing',
  refactoring: 'Refactoring',
  testing:     'Testing',
  reviewing:   'Reviewing',
  fixing:      'Fixing',
  documenting: 'Documenting',
};

export function AgentFeedPanel() {
  const { t } = useTranslation('app');
  const [open, setOpen] = useState(false);
  const activities = useActivityStore((s) => s.activities);
  const enabled = useActivityStore((s) => s.prefs.enabled);

  // Re-render every second only while the panel is open, so each card's
  // elapsed-time label ticks forward without putting Date.now() in the
  // render body (which the purity rule rightly forbids).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => { clearInterval(id); };
  }, [open]);

  const inflightCount = activities.filter((a) => a.state !== 'done').length;

  return (
    <>
      {/* Floating launcher — always visible bottom-right of the canvas.
          Pulses when there's traffic so the affordance is discoverable. */}
      {!open && (
        <button
          type="button"
          onClick={() => { setOpen(true); }}
          aria-label={t('agentFeed.open', { defaultValue: 'Open agent feed' })}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-3 h-9 rounded-full transition-colors hover-surface"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--fg-default)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
        >
          <span className="relative">
            <Bot className="w-4 h-4" />
            {inflightCount > 0 && enabled && (
              <span
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }}
              />
            )}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.18em]">
            {t('agentFeed.title', { defaultValue: 'Live agents' })}
          </span>
          {inflightCount > 0 && (
            <span
              className="font-mono text-[10px] tabular-nums px-1.5 rounded-full"
              style={{
                background: 'rgba(34,211,238,0.15)',
                color: '#22d3ee',
              }}
            >
              {inflightCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed top-20 right-4 bottom-6 w-[300px] z-30 pointer-events-auto"
        >
          <GlassCard className="h-full p-0 overflow-hidden flex flex-col">
            {/* Header */}
            <div
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <Activity className="w-3 h-3" style={{ color: '#22d3ee' }} />
              <div
                className="text-[9px] font-black uppercase tracking-[0.18em]"
                style={{ color: 'var(--fg-default)' }}
              >
                {t('agentFeed.title', { defaultValue: 'Live agents' })}
              </div>
              <span
                className="text-[9px] font-mono tabular-nums px-1.5 rounded-full"
                style={{
                  background: inflightCount > 0
                    ? 'rgba(34,211,238,0.15)'
                    : 'var(--bg-elevated)',
                  color: inflightCount > 0
                    ? '#22d3ee'
                    : 'var(--fg-subtle)',
                }}
              >
                {inflightCount} {t('agentFeed.inflight', { defaultValue: 'in flight' })}
              </span>
              <button
                type="button"
                onClick={() => { setOpen(false); }}
                aria-label={t('agentFeed.close', { defaultValue: 'Close' })}
                className="ml-auto -mr-1 p-1 rounded-md transition-colors hover-surface"
                style={{ color: 'var(--fg-subtle)' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Feed body */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              {activities.length === 0 ? (
                <div
                  className="px-3 py-8 text-center text-[10px] italic"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {t('agentFeed.empty', {
                    defaultValue: 'No agent activity right now. Try opening the chat or enabling demo mode.',
                  })}
                </div>
              ) : (
                <div className="px-2 py-2 space-y-1.5">
                  {activities.map((a) => (
                    <ActivityCard key={a.chatId} a={a} now={now} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div
              className="shrink-0 px-3 py-2 border-t text-[9px]"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--fg-subtle)',
                background: 'var(--bg-elevated)',
              }}
            >
              {t('agentFeed.footer', {
                defaultValue: 'Activities mirror the dot-field overlay · cyan = thinking · pulse = editing',
              })}
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );
}

function ActivityCard({ a, now }: { a: AiActivity; now: number }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('app');

  const target = a.targets[0];
  const file = target ? repo.files[target.fileId] : null;

  const stateLabel = useMemo(() => {
    if (a.state === 'thinking') return t('agentFeed.state.thinking', { defaultValue: 'thinking' });
    if (a.state === 'editing')  return t('agentFeed.state.editing',  { defaultValue: 'editing' });
    return t('agentFeed.state.done', { defaultValue: 'done' });
  }, [a.state, t]);

  const stateDot =
    a.state === 'editing'  ? a.hue :
    a.state === 'thinking' ? a.hue :
                             'var(--intent-success-fg)';

  const verb = target ? (ACTION_VERB[target.action] ?? target.action) : '';
  const elapsed = Math.max(0, Math.round((now - a.startedAt) / 1000));
  const elapsedLabel =
    elapsed < 60 ? `${elapsed}s` :
    `${Math.floor(elapsed / 60)}m`;

  return (
    <div
      className="rounded-lg px-2.5 py-2 transition-colors"
      style={{
        background: a.state === 'done'
          ? 'var(--bg-surface-muted)'
          : 'rgb(from var(--bg-elevated) r g b / 0.85)',
        border: `1px solid ${a.state === 'done' ? 'var(--border-muted)' : 'var(--border-default)'}`,
        opacity: a.state === 'done' ? 0.55 : 1,
      }}
    >
      {/* Top row: agent + state pill + elapsed */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.state === 'editing' ? 'animate-pulse' : ''}`}
          style={{ background: stateDot, boxShadow: a.state === 'editing' ? `0 0 6px ${stateDot}` : undefined }}
        />
        <span
          className="text-[10px] font-mono font-bold truncate"
          style={{ color: 'var(--fg-default)' }}
        >
          {a.agent}
        </span>
        <span
          className="text-[8.5px] font-black uppercase tracking-[0.18em]"
          style={{ color: stateDot }}
        >
          · {stateLabel}
        </span>
        <span
          className="ml-auto text-[9px] font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {elapsedLabel}
        </span>
      </div>

      {/* Action line: verb + filename */}
      {target && file && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-mono">
          <span style={{ color: 'var(--fg-muted)' }}>{verb}</span>
          <ChevronRight className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />
          <span
            className="truncate font-bold"
            style={{ color: 'var(--fg-default)' }}
            title={file.name}
          >
            {file.name}
          </span>
          {target.symbol && (
            <>
              <span className="opacity-50" style={{ color: 'var(--fg-subtle)' }}>·</span>
              <span
                className="truncate"
                style={{ color: 'var(--fg-link)' }}
              >
                {target.symbol}
              </span>
            </>
          )}
        </div>
      )}

      {/* Intent line */}
      {target && (
        <div
          className="mt-0.5 text-[9.5px] truncate"
          style={{ color: 'var(--fg-subtle)' }}
          title={target.intent}
        >
          {target.intent}
        </div>
      )}

      {/* Multi-target hint */}
      {a.targets.length > 1 && (
        <div
          className="mt-1 text-[9px] font-mono"
          style={{ color: 'var(--fg-subtle)' }}
        >
          + {a.targets.length - 1} {t('agentFeed.moreTargets', { defaultValue: 'more files' })}
        </div>
      )}
    </div>
  );
}
