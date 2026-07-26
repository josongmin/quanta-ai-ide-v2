import {
  AlertCircle, AlertOctagon, AlertTriangle, GitMerge, Hand, RefreshCcw,
  Activity, Coins, Inbox, ChevronRight, Zap,
} from 'lucide-react';
import type { FleetAlert, FleetHealth, HitlItem, Routine } from './types';
import { relativeFromMs } from './data';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

export function FleetRail({
  health,
  hitl,
  routines,
  onApproveHitl,
  onResolveConflict,
  onJumpToRun,
  commandsEnabled,
  commandDisabledReason,
  t,
}: {
  health: FleetHealth;
  hitl: HitlItem[];
  routines: Routine[];
  onApproveHitl: (id: string) => void;
  onResolveConflict: (routineIdA: string, routineIdB: string, path: string) => void;
  onJumpToRun: (runId: string, routineId: string) => void;
  // HITL-approval and conflict-resolution mutate real fleet state; disabled
  // when no command port is present. Jump-to-run is pure local nav and stays live.
  commandsEnabled: boolean;
  commandDisabledReason: string;
  isDark?: boolean;
  t: TranslateFn;
}) {
  const panel = 'bg-[var(--bg-surface)]';
  const border = 'border-[var(--border-default)]';
  const textFaint = 'text-[var(--fg-subtle)]';

  return (
    <aside className={`shrink-0 w-[300px] flex flex-col ${panel} border-l ${border}`}>
      <div className={`shrink-0 h-12 flex items-center px-4 border-b ${border}`}>
        <span className={`text-xs font-bold uppercase tracking-eyebrow ${textFaint}`}>
          {t('fleet.title')}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin p-4 space-y-5">
        <Section label={t('fleet.title')}>
          <ConcurrencyRow health={health} t={t} />
          <SpendRow health={health} t={t} />
          <AttentionRow health={health} t={t} />
        </Section>

        <Section label={t('hitl.title')}>
          <HitlList
            items={hitl}
            routines={routines}
            onApprove={onApproveHitl}
            onJump={onJumpToRun}
            commandsEnabled={commandsEnabled}
            commandDisabledReason={commandDisabledReason}
            t={t}
          />
        </Section>

        <Section label={t('fleet.alerts')}>
          {health.alerts.length === 0 ? (
            <Empty text={t('fleet.noAlerts')} />
          ) : (
            <div className="space-y-1">
              {health.alerts.map((a) => (
                <AlertRow key={a.id} alert={a} t={t} />
              ))}
            </div>
          )}
        </Section>

        {health.conflicts.length > 0 && (
          <Section label={t('fleet.conflicts')}>
            <div className="space-y-1">
              {health.conflicts.map((c, i) => (
                <ConflictRow
                  key={`${c.routineIdA}:${c.routineIdB}:${i}`}
                  a={routines.find((r) => r.id === c.routineIdA)?.name ?? c.routineIdA}
                  b={routines.find((r) => r.id === c.routineIdB)?.name ?? c.routineIdB}
                  path={c.path}
                  onResolve={() => { onResolveConflict(c.routineIdA, c.routineIdB, c.path); }}
                  commandsEnabled={commandsEnabled}
                  commandDisabledReason={commandDisabledReason}
                  t={t}
                />
              ))}
            </div>
          </Section>
        )}
      </div>

      <div className={`shrink-0 px-4 py-3 border-t ${border} text-xs font-mono ${textFaint}`}>
        {t('footer')}
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const color = 'text-[var(--fg-subtle)]';
  return (
    <div>
      <div className={`mb-2.5 text-xs font-bold uppercase tracking-eyebrow ${color}`}>{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className={`px-2 py-2 text-sm text-[var(--fg-subtle)]`}>{text}</div>;
}

function ConcurrencyRow({ health, t }: { health: FleetHealth; t: TranslateFn }) {
  const muted = 'text-[var(--fg-muted)]';
  const heading = 'text-[var(--fg-default)]';
  const trackBg = 'bg-[var(--bg-elevated)]';
  const fill = 'bg-[color:var(--intent-success-vivid)]';
  const pct = Math.min(100, (health.running / Math.max(1, health.maxConcurrency)) * 100);
  return (
    <div>
      <div className={`flex items-center justify-between text-sm ${heading}`}>
        <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 opacity-70" />{t('fleet.concurrency', { running: health.running, queued: health.queued })}</span>
        <span className={`text-xs font-mono ${muted}`}>{t('fleet.concurrencyMax', { n: health.maxConcurrency })}</span>
      </div>
      <div className={`mt-1 h-1 rounded-full ${trackBg} overflow-hidden`}>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SpendRow({ health, t }: { health: FleetHealth; t: TranslateFn }) {
  const heading = 'text-[var(--fg-default)]';
  return (
    <div className={`flex items-center gap-1.5 text-sm font-mono tabular-nums ${heading}`}>
      <Coins className="w-3 h-3 opacity-70" />
      {t('fleet.spendHour', { usd: health.spendLastHourUsd.toFixed(2), day: health.projectedDailyUsd.toFixed(2) })}
    </div>
  );
}

function AttentionRow({ health, t }: { health: FleetHealth; t: TranslateFn }) {
  const muted = 'text-[var(--fg-muted)]';
  const heading = 'text-[var(--fg-default)]';
  const trackBg = 'bg-[var(--bg-elevated)]';
  const pct = Math.min(100, (health.attention.spentHours / Math.max(0.1, health.attention.budgetHours)) * 100);
  const fill = pct < 70 ? 'bg-[color:var(--intent-success-vivid)]'
    : pct < 95 ? 'bg-[color:var(--intent-warn-vivid)]'
    : 'bg-[color:var(--intent-danger-vivid)]';
  return (
    <div>
      <div className={`flex items-center justify-between text-sm ${heading}`}>
        <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 opacity-70" />{t('fleet.attention')}</span>
      </div>
      <div className={`mt-0.5 text-xs font-mono tabular-nums ${muted}`}>
        {t('fleet.attentionSpent', { h: health.attention.spentHours.toFixed(1), budget: health.attention.budgetHours.toFixed(0) })}
      </div>
      <div className={`mt-1 h-1 rounded-full ${trackBg} overflow-hidden`}>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HitlList({
  items, routines, onApprove, onJump, commandsEnabled, commandDisabledReason, t,
}: {
  items: HitlItem[];
  routines: Routine[];
  onApprove: (id: string) => void;
  onJump: (runId: string, routineId: string) => void;
  commandsEnabled: boolean;
  commandDisabledReason: string;
  t: TranslateFn;
}) {
  if (items.length === 0) {
    return (
      <div className={`flex items-center gap-2 px-2 py-2 text-sm text-[var(--fg-subtle)]`}>
        <Inbox className="w-3 h-3 opacity-60" />
        {t('hitl.empty')}
      </div>
    );
  }
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const heading = 'text-[var(--fg-default)]';

  return (
    <div className="space-y-1">
      {items.map((it) => {
        const rname = routines.find((r) => r.id === it.routineId)?.name ?? it.routineId;
        const stale = it.waitingMs > 60 * 60 * 1000;
        const tone = stale
          ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)]'
          : 'border-[var(--border-default)] bg-[var(--bg-surface-muted)]';
        const wait = it.waitingMs >= 3600_000
          ? `${Math.round(it.waitingMs / 3600_000)}h`
          : `${Math.round(it.waitingMs / 60_000)}m`;
        return (
          <div key={it.id} className={`px-2 py-1.5 rounded-md border ${tone}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Hand className={`w-3 h-3 shrink-0 ${stale ? 'text-[color:var(--intent-warn-fg)]' : 'text-[var(--fg-muted)]'}`} />
              <span className={`text-sm font-semibold truncate ${heading}`}>{rname}</span>
              <span className={`ml-auto text-xs font-mono ${faint}`}>{wait}</span>
            </div>
            <div className={`text-xs leading-snug ${muted} mb-1`}>{it.reason}</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!commandsEnabled}
                aria-disabled={!commandsEnabled}
                onClick={commandsEnabled ? () => { onApprove(it.id); } : undefined}
                title={commandsEnabled ? undefined : commandDisabledReason}
                className={`flex-1 text-xs font-mono px-2 py-1 rounded-md transition-colors ${
                  commandsEnabled
                    ? 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-selected)] text-[var(--fg-default)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--fg-subtle)] opacity-50 cursor-not-allowed'
                }`}
              >
                {it.suggestedAction}
              </button>
              <button
                type="button"
                onClick={() => { onJump(it.runId, it.routineId); }}
                className={`p-1 rounded-md transition-colors text-[var(--fg-subtle)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-elevated)]`}
                aria-label="Open run"
                title={t('run.details')}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlertRow({ alert, t }: { alert: FleetAlert; t: TranslateFn }) {
  const tone =
    alert.severity === 'crit' ? 'border-[color:var(--intent-danger-fg)] bg-[color:var(--intent-danger-bg)] text-[color:var(--intent-danger-fg)]'
    : alert.severity === 'warn' ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)]'
    : 'border-[var(--border-strong)] bg-[var(--bg-hover)] text-[var(--fg-muted)]';
  const Icon = alert.severity === 'crit' ? AlertOctagon : alert.severity === 'warn' ? AlertTriangle : AlertCircle;
  const faint = 'text-[var(--fg-subtle)]';
  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded-md border ${tone}`}>
      <Icon className="w-3 h-3 shrink-0 mt-0.5 opacity-80" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-eyebrow opacity-80">{t(`fleet.alertKind.${alert.kind}`)}</div>
        <div className="text-sm leading-snug">{alert.message}</div>
        <div className={`text-xs font-mono ${faint}`}>{relativeFromMs(alert.atMs)}</div>
      </div>
    </div>
  );
}

function ConflictRow({
  a, b, path, onResolve, commandsEnabled, commandDisabledReason, t,
}: {
  a: string;
  b: string;
  path: string;
  onResolve: () => void;
  commandsEnabled: boolean;
  commandDisabledReason: string;
  t: TranslateFn;
}) {
  const muted = 'text-[var(--fg-muted)]';
  const heading = 'text-[var(--fg-default)]';
  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-muted)]`}>
      <GitMerge className={`w-3 h-3 shrink-0 mt-0.5 ${muted}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${heading}`}>{t('fleet.conflictRow', { a, b })}</div>
        <div className={`text-xs font-mono truncate ${muted}`}>{path}</div>
      </div>
      <button
        type="button"
        disabled={!commandsEnabled}
        aria-disabled={!commandsEnabled}
        onClick={commandsEnabled ? onResolve : undefined}
        className={`shrink-0 p-1 rounded-md transition-colors ${
          commandsEnabled
            ? 'text-[var(--fg-subtle)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-elevated)]'
            : 'text-[var(--fg-subtle)] opacity-50 cursor-not-allowed'
        }`}
        aria-label={t('fleet.conflictResolve')}
        title={commandsEnabled ? t('fleet.conflictResolve') : commandDisabledReason}
      >
        <RefreshCcw className="w-3 h-3" />
      </button>
    </div>
  );
}
