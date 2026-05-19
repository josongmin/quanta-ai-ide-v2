import { useMemo } from 'react';
import {
  GitBranch, GitPullRequest, FileCode, Sparkles, ArrowRight,
  CheckCircle2, ListTodo, Cpu, Coins, Zap, Activity,
} from 'lucide-react';
import { formatNumber } from '@shared/lib';
import type { Task, PlanBlock, AgentTurn } from '../types';

// Same prices used by the cost meter in CodingStage. Duplicated here to
// avoid a circular import; if pricing changes, update both.
const SNAPSHOT_PRICING: Record<string, { in: number; out: number }> = {
  'claude-opus-4-7':   { in: 15.00, out: 75.00 },
  'claude-sonnet-4-6': { in:  3.00, out: 15.00 },
  'claude-haiku-4-5':  { in:  0.80, out:  4.00 },
};

// Live snapshot card. Sits in the empty trailing space of the thread (after
// the last agent turn, before the composer) and surfaces, at a glance,
// what the agent has been doing — branch + diff stats, files touched, plan
// progress — plus three quick follow-up actions. Hidden while streaming
// and on empty threads (the EmptyState carries those).

type Props = {
  task: Task;
  isDark: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onContinue: () => void;
};

export function LiveSnapshotCard({ task, t, onContinue }: Props) {
  const stats = task.diffStats;
  const { touched, plan } = useMemo(() => extractAgentState(task), [task]);

  // Roll-up of agent metadata across the task: latest model used, total
  // tokens spent, total elapsed time. Lets the snapshot answer "how much
  // did this cost / how long did it take / on which model" without the
  // user having to scroll up and inspect individual turns.
  const agentRoll = useMemo(() => {
    let inTok = 0; let outTok = 0; let usd = 0;
    let elapsedSec = 0;
    let lastModel: string | undefined;
    let lastPhase: AgentTurn['phase'] | undefined;
    for (const tn of task.thread) {
      if (tn.role !== 'agent') continue;
      if (tn.model) lastModel = tn.model;
      if (tn.phase && tn.streaming) lastPhase = tn.phase;
      if (tn.tokens) {
        inTok += tn.tokens.in;
        outTok += tn.tokens.out;
        const rate = SNAPSHOT_PRICING[tn.model ?? 'claude-opus-4-7'] ?? SNAPSHOT_PRICING['claude-opus-4-7'];
        usd += (tn.tokens.in / 1_000_000) * rate.in + (tn.tokens.out / 1_000_000) * rate.out;
      }
      if (tn.elapsed) {
        const m = /^([\d.]+)s$/.exec(tn.elapsed);
        if (m) elapsedSec += parseFloat(m[1]);
      }
    }
    return { inTok, outTok, usd, elapsedSec, lastModel, lastPhase };
  }, [task.thread]);

  const card = 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-default)]';
  const textMuted = 'text-[color:var(--fg-muted)]';
  const textFaint = 'text-[color:var(--fg-subtle)]';
  const divider = 'border-[color:var(--border-muted)]';

  const planRemaining = plan ? plan.items.filter((i) => !i.done).length : null;
  const planLabel = plan === null
    ? t('snapshot.noPlan')
    : planRemaining === 0
      ? t('snapshot.planAllDone')
      : t('snapshot.planRemaining', { count: planRemaining });

  const modelShort = agentRoll.lastModel
    ? agentRoll.lastModel.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.')
    : null;

  return (
    <div className={`rounded-xl border ${card} overflow-hidden`}>
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <Sparkles className={`w-3 h-3 ${textFaint}`} />
        <span className={`text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] ${textFaint}`}>
          {t('snapshot.title')}
        </span>
        <span className={`text-[11px] ${textMuted}`}>{t('snapshot.subtitle')}</span>
      </div>

      <div className={`grid grid-cols-3 border-t ${divider}`}>
        <Stat
          icon={GitBranch}
          label={t('snapshot.branch')}
          value={task.branch}
          mono
        />
        <Stat
          icon={FileCode}
          label={t('snapshot.diff')}
          value={
            <span className="font-mono">
              <span style={{ color: 'var(--intent-success-vivid)' }}>+{stats.added}</span>
              <span className={textFaint}> · </span>
              <span style={{ color: 'var(--intent-danger-vivid)' }}>−{stats.removed}</span>
            </span>
          }
          dividerLeft
        />
        <Stat
          icon={ListTodo}
          label={t('snapshot.files')}
          value={<span className="font-mono">{stats.files}</span>}
          dividerLeft
        />
      </div>

      {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should be falsy */}
      {(modelShort || agentRoll.inTok + agentRoll.outTok > 0 || agentRoll.elapsedSec > 0) && (
        <div className={`grid grid-cols-4 border-t ${divider}`}>
          <Stat
            icon={Cpu}
            label={t('snapshotV2.model')}
            value={
              <span className="font-mono truncate" title={agentRoll.lastModel ?? '—'}>
                {modelShort ?? '—'}
              </span>
            }
          />
          <Stat
            icon={Activity}
            label={t('snapshotV2.phase')}
            value={
              <span className="font-mono">
                {agentRoll.lastPhase ? t(`phase.${agentRoll.lastPhase}`) : '—'}
              </span>
            }
            dividerLeft
          />
          <Stat
            icon={Coins}
            label={t('snapshotV2.cost')}
            value={
              <span className="font-mono tabular-nums" title={`${formatNumber(agentRoll.inTok)} in · ${formatNumber(agentRoll.outTok)} out`}>
                {agentRoll.usd > 0
                  ? `$${agentRoll.usd.toFixed(agentRoll.usd < 0.01 ? 4 : agentRoll.usd < 1 ? 3 : 2)}`
                  : '—'}
              </span>
            }
            dividerLeft
          />
          <Stat
            icon={Zap}
            label={t('snapshotV2.elapsed')}
            value={
              <span className="font-mono tabular-nums">
                {agentRoll.elapsedSec > 0 ? `${agentRoll.elapsedSec.toFixed(1)}s` : '—'}
              </span>
            }
            dividerLeft
          />
        </div>
      )}

      {touched.length > 0 && (
        <div className={`px-3.5 py-2.5 border-t ${divider}`}>
          <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] ${textFaint}`}>
            {t('snapshot.touched')}
          </div>
          <div className="flex flex-wrap gap-1">
            {touched.slice(0, 4).map((file) => (
              <span
                key={file.path}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-[color:var(--bg-hover)] text-[color:var(--fg-default)]"
                title={file.path}
              >
                <span style={{ color: file.kind === 'edit' ? 'var(--intent-success-fg)' : 'var(--intent-info-fg)' }}>
                  {file.kind === 'edit' ? '✎' : '◵'}
                </span>
                {file.path.split('/').pop()}
              </span>
            ))}
            {touched.length > 4 && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono ${textFaint}`}>
                {t('snapshot.moreFiles', { count: touched.length - 4 })}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 px-3 py-2 border-t ${divider} bg-[color:var(--bg-surface-muted)]`}>
        <CheckCircle2
          className={`w-3 h-3 shrink-0 ${planRemaining === 0 ? '' : textFaint}`}
          style={planRemaining === 0 ? { color: 'var(--intent-success-fg)' } : undefined}
        />
        <span className={`text-[11px] ${textMuted} truncate`}>{planLabel}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors text-[color:var(--fg-strong)] bg-[color:var(--bg-elevated)] hover:bg-[color:var(--bg-active)]"
        >
          {t('snapshot.continue')}
          <ArrowRight className="w-2.5 h-2.5" />
        </button>
        <button
          type="button"
          style={{
            color: 'var(--intent-success-fg)',
            background: 'var(--intent-success-bg)',
            border: '1px solid color-mix(in srgb, var(--intent-success-vivid) 30%, transparent)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
        >
          <GitPullRequest className="w-2.5 h-2.5" />
          {t('snapshot.openPr')}
        </button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, dividerLeft, mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  dividerLeft?: boolean;
  mono?: boolean;
}) {
  const textPrimary = 'text-[color:var(--fg-strong)]';
  const textFaint = 'text-[color:var(--fg-subtle)]';
  const left = dividerLeft ? 'border-l border-[color:var(--border-muted)]' : '';
  return (
    <div className={`flex flex-col gap-1 px-3.5 py-2.5 min-w-0 ${left}`}>
      <div className="flex items-center gap-1">
        <Icon className={`w-2.5 h-2.5 ${textFaint}`} />
        <span className={`text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] ${textFaint}`}>
          {label}
        </span>
      </div>
      <div className={`text-[12px] truncate ${textPrimary} ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}

// Walk the agent's blocks to derive (a) the most recent plan block and
// (b) a deduped list of files the agent read or edited. Read appears as
// 'read', edit as 'edit'. Edit wins if the same file was both.
function extractAgentState(task: Task): {
  touched: { path: string; kind: 'read' | 'edit' }[];
  plan: PlanBlock | null;
} {
  const touched = new Map<string, 'read' | 'edit'>();
  let plan: PlanBlock | null = null;
  for (const turn of task.thread) {
    if (turn.role !== 'agent') continue;
    const agent = turn;
    for (const block of agent.blocks) {
      if (block.kind === 'plan') plan = block;
      if (block.kind === 'tool') {
        const tool = block;
        if (tool.tool === 'read' || tool.tool === 'edit') {
          const path = tool.label;
          if (path.includes('/') || path.includes('.')) {
            const cur = touched.get(path);
            if (cur !== 'edit') touched.set(path, tool.tool);
          }
        }
      }
    }
  }
  return {
    touched: Array.from(touched.entries()).map(([path, kind]) => ({ path, kind })),
    plan,
  };
}
