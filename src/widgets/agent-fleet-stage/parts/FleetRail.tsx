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
  onJumpToRun,
  isDark,
  t,
}: {
  health: FleetHealth;
  hitl: HitlItem[];
  routines: Routine[];
  onApproveHitl: (id: string) => void;
  onJumpToRun: (runId: string, routineId: string) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const panel = isDark ? 'bg-[#11161e]' : 'bg-white';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';

  return (
    <aside className={`shrink-0 w-[300px] flex flex-col ${panel} border-l ${border}`}>
      <div className={`shrink-0 h-12 flex items-center px-4 border-b ${border}`}>
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
          {t('fleet.title')}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin p-4 space-y-5">
        <Section label={t('fleet.title')} isDark={isDark}>
          <ConcurrencyRow health={health} isDark={isDark} t={t} />
          <SpendRow health={health} isDark={isDark} t={t} />
          <AttentionRow health={health} isDark={isDark} t={t} />
        </Section>

        <Section label={t('hitl.title')} isDark={isDark}>
          <HitlList
            items={hitl}
            routines={routines}
            onApprove={onApproveHitl}
            onJump={onJumpToRun}
            isDark={isDark}
            t={t}
          />
        </Section>

        <Section label={t('fleet.alerts')} isDark={isDark}>
          {health.alerts.length === 0 ? (
            <Empty text={t('fleet.noAlerts')} isDark={isDark} />
          ) : (
            <div className="space-y-1">
              {health.alerts.map((a) => (
                <AlertRow key={a.id} alert={a} isDark={isDark} t={t} />
              ))}
            </div>
          )}
        </Section>

        {health.conflicts.length > 0 && (
          <Section label={t('fleet.conflicts')} isDark={isDark}>
            <div className="space-y-1">
              {health.conflicts.map((c, i) => (
                <ConflictRow
                  key={`${c.routineIdA}:${c.routineIdB}:${i}`}
                  a={routines.find((r) => r.id === c.routineIdA)?.name ?? c.routineIdA}
                  b={routines.find((r) => r.id === c.routineIdB)?.name ?? c.routineIdB}
                  path={c.path}
                  isDark={isDark}
                  t={t}
                />
              ))}
            </div>
          </Section>
        )}
      </div>

      <div className={`shrink-0 px-4 py-3 border-t ${border} text-[10px] font-mono ${textFaint}`}>
        {t('footer')}
      </div>
    </aside>
  );
}

function Section({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  const color = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <div>
      <div className={`mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] ${color}`}>{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Empty({ text, isDark }: { text: string; isDark: boolean }) {
  return <div className={`px-2 py-2 text-[11px] ${isDark ? 'text-white/40' : 'text-black/45'}`}>{text}</div>;
}

function ConcurrencyRow({ health, isDark, t }: { health: FleetHealth; isDark: boolean; t: TranslateFn }) {
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const trackBg = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]';
  const fill = 'bg-[color:var(--intent-success-vivid)]';
  const pct = Math.min(100, (health.running / Math.max(1, health.maxConcurrency)) * 100);
  return (
    <div>
      <div className={`flex items-center justify-between text-[11px] ${heading}`}>
        <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 opacity-70" />{t('fleet.concurrency', { running: health.running, queued: health.queued })}</span>
        <span className={`text-[10px] font-mono ${muted}`}>{t('fleet.concurrencyMax', { n: health.maxConcurrency })}</span>
      </div>
      <div className={`mt-1 h-1 rounded-full ${trackBg} overflow-hidden`}>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SpendRow({ health, isDark, t }: { health: FleetHealth; isDark: boolean; t: TranslateFn }) {
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-mono tabular-nums ${heading}`}>
      <Coins className="w-3 h-3 opacity-70" />
      {t('fleet.spendHour', { usd: health.spendLastHourUsd.toFixed(2), day: health.projectedDailyUsd.toFixed(2) })}
    </div>
  );
}

function AttentionRow({ health, isDark, t }: { health: FleetHealth; isDark: boolean; t: TranslateFn }) {
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const trackBg = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]';
  const pct = Math.min(100, (health.attention.spentHours / Math.max(0.1, health.attention.budgetHours)) * 100);
  const fill = pct < 70 ? 'bg-[color:var(--intent-success-vivid)]'
    : pct < 95 ? 'bg-[color:var(--intent-warn-vivid)]'
    : 'bg-[color:var(--intent-danger-vivid)]';
  return (
    <div>
      <div className={`flex items-center justify-between text-[11px] ${heading}`}>
        <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 opacity-70" />{t('fleet.attention')}</span>
      </div>
      <div className={`mt-0.5 text-[10px] font-mono tabular-nums ${muted}`}>
        {t('fleet.attentionSpent', { h: health.attention.spentHours.toFixed(1), budget: health.attention.budgetHours.toFixed(0) })}
      </div>
      <div className={`mt-1 h-1 rounded-full ${trackBg} overflow-hidden`}>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HitlList({
  items, routines, onApprove, onJump, isDark, t,
}: {
  items: HitlItem[];
  routines: Routine[];
  onApprove: (id: string) => void;
  onJump: (runId: string, routineId: string) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  if (items.length === 0) {
    return (
      <div className={`flex items-center gap-2 px-2 py-2 text-[11px] ${isDark ? 'text-white/40' : 'text-black/45'}`}>
        <Inbox className="w-3 h-3 opacity-60" />
        {t('hitl.empty')}
      </div>
    );
  }
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const heading = isDark ? 'text-white/85' : 'text-black/85';

  return (
    <div className="space-y-1">
      {items.map((it) => {
        const rname = routines.find((r) => r.id === it.routineId)?.name ?? it.routineId;
        const stale = it.waitingMs > 60 * 60 * 1000;
        const tone = stale
          ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)]'
          : (isDark ? 'border-white/[0.08] bg-white/[0.025]' : 'border-black/[0.08] bg-black/[0.02]');
        const wait = it.waitingMs >= 3600_000
          ? `${Math.round(it.waitingMs / 3600_000)}h`
          : `${Math.round(it.waitingMs / 60_000)}m`;
        return (
          <div key={it.id} className={`px-2 py-1.5 rounded-md border ${tone}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Hand className={`w-3 h-3 shrink-0 ${stale ? 'text-[color:var(--intent-warn-fg)]' : (isDark ? 'text-white/55' : 'text-black/55')}`} />
              <span className={`text-[11px] font-semibold truncate ${heading}`}>{rname}</span>
              <span className={`ml-auto text-[10px] font-mono ${faint}`}>{wait}</span>
            </div>
            <div className={`text-[10px] leading-snug ${muted} mb-1`}>{it.reason}</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { onApprove(it.id); }}
                className={`flex-1 text-[10px] font-mono px-2 py-1 rounded-md transition-colors ${
                  isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/85' : 'bg-black/[0.05] hover:bg-black/[0.08] text-black/85'
                }`}
              >
                {it.suggestedAction}
              </button>
              <button
                type="button"
                onClick={() => { onJump(it.runId, it.routineId); }}
                className={`p-1 rounded-md transition-colors ${
                  isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.05]'
                }`}
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

function AlertRow({ alert, isDark, t }: { alert: FleetAlert; isDark: boolean; t: TranslateFn }) {
  const tone =
    alert.severity === 'crit' ? 'border-[color:var(--intent-danger-fg)] bg-[color:var(--intent-danger-bg)] text-[color:var(--intent-danger-fg)]'
    : alert.severity === 'warn' ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)]'
    : (isDark ? 'border-white/[0.10] bg-white/[0.04] text-white/65' : 'border-black/[0.10] bg-black/[0.04] text-black/65');
  const Icon = alert.severity === 'crit' ? AlertOctagon : alert.severity === 'warn' ? AlertTriangle : AlertCircle;
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded-md border ${tone}`}>
      <Icon className="w-3 h-3 shrink-0 mt-0.5 opacity-80" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">{t(`fleet.alertKind.${alert.kind}`)}</div>
        <div className="text-[11px] leading-snug">{alert.message}</div>
        <div className={`text-[10px] font-mono ${faint}`}>{relativeFromMs(alert.atMs)}</div>
      </div>
    </div>
  );
}

function ConflictRow({ a, b, path, isDark, t }: { a: string; b: string; path: string; isDark: boolean; t: TranslateFn }) {
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded-md border ${
      isDark ? 'border-white/[0.08] bg-white/[0.025]' : 'border-black/[0.08] bg-black/[0.02]'
    }`}>
      <GitMerge className={`w-3 h-3 shrink-0 mt-0.5 ${muted}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] truncate ${heading}`}>{t('fleet.conflictRow', { a, b })}</div>
        <div className={`text-[10px] font-mono truncate ${muted}`}>{path}</div>
      </div>
      <button
        type="button"
        className={`shrink-0 p-1 rounded-md transition-colors ${
          isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.05]'
        }`}
        aria-label={t('fleet.conflictResolve')}
        title={t('fleet.conflictResolve')}
      >
        <RefreshCcw className="w-3 h-3" />
      </button>
    </div>
  );
}
