import { useMemo, type ComponentType, type ReactNode } from 'react';
import {
  Activity, AlertOctagon, Briefcase, CheckCircle2, Clock, Code,
  FileCode, Hash as HashIcon, MessageCircle, Palette, Sparkles,
} from 'lucide-react';
import type {
  AgentTurn, BranchState, CiCheck, Integration, PrState, Project, Task,
} from '../types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;
type Density = 'compact' | 'comfortable' | 'spacious';
type DriftState = { kind: 'stuck' | 'noisy' | 'ok' | 'idle'; multiple: number };
type SuccessRateData = {
  byTool: Record<string, { ok: number; total: number }>;
  byModel: Record<string, { ok: number; total: number }>;
};

export function ContextRail({
  task,
  project,
  accent,
  isDark,
  t,
  density,
  onDensityChange,
  highContrast,
  onHighContrastChange,
}: {
  task: Task;
  project: Project;
  accent: string;
  isDark: boolean;
  t: TranslateFn;
  density: Density;
  onDensityChange: (d: Density) => void;
  highContrast: boolean;
  onHighContrastChange: (v: boolean) => void;
}) {
  const drift = useMemo<DriftState>(() => {
    const agentTurns = task.thread.filter((tn): tn is AgentTurn => tn.role === 'agent');
    if (agentTurns.length < 3) return { kind: 'idle', multiple: 0 };
    const last = agentTurns[agentTurns.length - 1];
    const prior = agentTurns.slice(0, -1);

    function thinkingRatio(tn: AgentTurn): number {
      if (tn.blocks.length === 0) return 0;
      return tn.blocks.filter((b) => b.kind === 'thinking').length / tn.blocks.length;
    }

    function toolCount(tn: AgentTurn): number {
      return tn.blocks.filter((b) => b.kind === 'tool').length;
    }

    const baselineThinking = prior.reduce((s, tn) => s + thinkingRatio(tn), 0) / prior.length || 0.01;
    const baselineTools = prior.reduce((s, tn) => s + toolCount(tn), 0) / prior.length || 0.5;
    const thinkingMul = thinkingRatio(last) / baselineThinking;
    const toolMul = toolCount(last) / baselineTools;

    if (thinkingMul >= 2.0) return { kind: 'stuck', multiple: thinkingMul };
    if (toolMul >= 2.0) return { kind: 'noisy', multiple: toolMul };
    return { kind: 'ok', multiple: 1 };
  }, [task.thread]);

  const successRate = useMemo<SuccessRateData>(() => {
    const byTool: SuccessRateData['byTool'] = {};
    const byModel: SuccessRateData['byModel'] = {};

    for (const tn of task.thread) {
      if (tn.role !== 'agent') continue;
      const model = tn.model ?? 'unknown';

      for (const block of tn.blocks) {
        if (block.kind !== 'tool') continue;
        const ok = block.status === 'ok' || block.status == null;

        byTool[block.tool] = byTool[block.tool] ?? { ok: 0, total: 0 };
        byTool[block.tool].total += 1;
        if (ok) byTool[block.tool].ok += 1;

        byModel[model] = byModel[model] ?? { ok: 0, total: 0 };
        byModel[model].total += 1;
        if (ok) byModel[model].ok += 1;
      }
    }

    return { byTool, byModel };
  }, [task.thread]);

  const hasSuccessData =
    Object.keys(successRate.byTool).length > 0 ||
    Object.keys(successRate.byModel).length > 0;

  const panel = isDark ? 'bg-[#11161e]' : 'bg-white';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';

  return (
    <aside className={`shrink-0 w-[268px] flex flex-col ${panel} border-l ${border}`}>
      <div className={`shrink-0 h-12 flex items-center px-4 border-b ${border}`}>
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
          {t('context.title')}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin p-4 space-y-5">
        <ContextSection label={t('context.project')} isDark={isDark}>
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            isDark ? 'bg-white/[0.025] border border-white/[0.06]' : 'bg-black/[0.02] border border-black/[0.06]'
          }`}>
            <span
              className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md font-mono text-[12px] font-bold"
              style={{
                background: `${accent}1f`,
                color: accent,
                boxShadow: `inset 0 0 0 1px ${accent}33`,
              }}
            >
              {project.initial}
            </span>
            <div className="min-w-0">
              <div className={`text-[12px] font-semibold truncate ${isDark ? 'text-white/85' : 'text-black/85'}`}>
                {project.name}
              </div>
              <div className={`text-[10px] font-mono truncate ${textFaint}`}>
                {project.slug}
              </div>
            </div>
          </div>
        </ContextSection>

        <ContextSection label={t('context.environment')} isDark={isDark}>
          <Field label={t('context.branch')} value={task.branch} mono isDark={isDark} />
          <Field label={t('context.base')} value={task.baseBranch} mono isDark={isDark} />
          <Field label={t('context.runtime')} value="node 20.11" mono isDark={isDark} />
        </ContextSection>

        <ContextSection label={t('context.activity')} isDark={isDark}>
          <ActivityRow icon={Clock} text={t('context.activityStarted')} time="2m" isDark={isDark} />
          <ActivityRow icon={Sparkles} text={t('context.activityPlanned')} time="2m" isDark={isDark} />
          <ActivityRow icon={FileCode} text={t('context.activityEdited')} time="1m" isDark={isDark} />
          <ActivityRow icon={CheckCircle2} text={t('context.activityTests')} time="now" isDark={isDark} />
        </ContextSection>

        {drift.kind !== 'idle' && (
          <ContextSection label={t('drift.label')} isDark={isDark}>
            <DriftRow drift={drift} isDark={isDark} t={t} />
          </ContextSection>
        )}

        {hasSuccessData && (
          <ContextSection label={t('successRate.label')} isDark={isDark}>
            <SuccessRatePanel data={successRate} isDark={isDark} t={t} />
          </ContextSection>
        )}

        {(task.branchState != null || task.prState != null) && (
          <ContextSection label={t('prCi.branchTitle')} isDark={isDark}>
            <PrCiPanel
              branchState={task.branchState}
              prState={task.prState}
              isDark={isDark}
              t={t}
            />
          </ContextSection>
        )}

        {project.integrations && project.integrations.length > 0 && (
          <ContextSection label={t('integrations.title')} isDark={isDark}>
            {project.integrations.map((it, i) => (
              <IntegrationRow key={`${it.kind}:${i}`} integration={it} isDark={isDark} t={t} />
            ))}
          </ContextSection>
        )}

        <ContextSection label={t('density.label')} isDark={isDark}>
          <div className={`flex items-center gap-px rounded-md p-px ${
            isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
          }`}>
            {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { onDensityChange(d); }}
                aria-pressed={density === d}
                className={`flex-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  density === d
                    ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black')
                    : (isDark ? 'text-white/45 hover:text-white/75' : 'text-black/45 hover:text-black/75')
                }`}
              >
                {t(`density.${d}`)}
              </button>
            ))}
          </div>
        </ContextSection>

        <ContextSection label={t('a11y.highContrast')} isDark={isDark}>
          <button
            type="button"
            onClick={() => { onHighContrastChange(!highContrast); }}
            aria-pressed={highContrast}
            className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-[11px] transition-colors ${
              isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.025]'
            }`}
          >
            <span className={isDark ? 'text-white/70' : 'text-black/70'}>
              {t('a11y.highContrast')}
            </span>
            <span
              style={highContrast ? { background: 'var(--intent-success-vivid)' } : undefined}
              className={`shrink-0 inline-flex items-center w-7 h-3.5 rounded-full transition-colors ${
                highContrast
                  ? ''
                  : (isDark ? 'bg-white/[0.15]' : 'bg-black/[0.15]')
              }`}
            >
              <span
                className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                  highContrast ? 'translate-x-[14px]' : 'translate-x-px'
                }`}
              />
            </span>
          </button>
        </ContextSection>
      </div>

      <div className={`shrink-0 px-4 py-3 border-t ${border} text-[10px] font-mono ${textFaint}`}>
        {t('context.footer')}
      </div>
    </aside>
  );
}

function SuccessRatePanel({
  data, isDark, t,
}: {
  data: SuccessRateData;
  isDark: boolean;
  t: TranslateFn;
}) {
  const muted = isDark ? 'text-white/45' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const trackBg = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]';

  function rateRow(label: string, ok: number, total: number, key: string) {
    const pct = total > 0 ? (ok / total) * 100 : 0;
    const fillBg = pct >= 80
      ? 'var(--intent-success-vivid)'
      : pct >= 50
        ? 'var(--intent-warn-vivid)'
        : 'var(--intent-danger-vivid)';

    return (
      <div key={key} className="flex items-center gap-2 text-[10px]">
        <span className={`shrink-0 w-14 truncate font-mono ${muted}`} title={label}>{label}</span>
        <div className={`flex-1 h-1 rounded-full ${trackBg} overflow-hidden`}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fillBg }} />
        </div>
        <span className={`shrink-0 w-10 text-right font-mono tabular-nums ${muted}`}>
          {t('successRate.rate', { ok, total })}
        </span>
      </div>
    );
  }

  const toolEntries = Object.entries(data.byTool);
  const modelEntries = Object.entries(data.byModel);

  return (
    <div className="space-y-2">
      {toolEntries.length > 0 && (
        <div className="space-y-1">
          <div className={`text-[9px] font-bold uppercase tracking-[0.18em] ${faint}`}>
            {t('successRate.byTool')}
          </div>
          {toolEntries.map(([tool, { ok, total }]) => rateRow(tool, ok, total, `t:${tool}`))}
        </div>
      )}
      {modelEntries.length > 0 && (
        <div className="space-y-1">
          <div className={`text-[9px] font-bold uppercase tracking-[0.18em] ${faint}`}>
            {t('successRate.byModel')}
          </div>
          {modelEntries.map(([model, { ok, total }]) => {
            const short = model.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.');
            return rateRow(short, ok, total, `m:${model}`);
          })}
        </div>
      )}
    </div>
  );
}

function DriftRow({
  drift, isDark, t,
}: {
  drift: DriftState;
  isDark: boolean;
  t: TranslateFn;
}) {
  if (drift.kind === 'idle') return null;
  void isDark;
  const isAnomaly = drift.kind === 'stuck' || drift.kind === 'noisy';
  const toneStyle: React.CSSProperties = isAnomaly
    ? {
        borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 40%, transparent)',
        background: 'var(--intent-warn-bg)',
        color: 'var(--intent-warn-fg)',
      }
    : {
        borderColor: 'color-mix(in srgb, var(--intent-success-vivid) 30%, transparent)',
        background: 'var(--intent-success-bg)',
        color: 'var(--intent-success-fg)',
      };
  const x = drift.multiple.toFixed(1);
  const text = drift.kind === 'stuck' ? t('drift.stuck', { x })
    : drift.kind === 'noisy' ? t('drift.noisy', { x })
    : t('drift.ok');

  return (
    <div style={toneStyle} className="flex items-start gap-2 px-2 py-1.5 rounded-md border">
      <Activity className="w-3 h-3 shrink-0 mt-0.5 opacity-80" />
      <span className="text-[11px] leading-relaxed">{text}</span>
    </div>
  );
}

const INTEGRATION_ICON: Record<Integration['kind'], ComponentType<{ className?: string }>> = {
  slack: MessageCircle,
  linear: HashIcon,
  jira: Briefcase,
  github: Code,
  sentry: AlertOctagon,
  figma: Palette,
};

function PrCiPanel({
  branchState, prState, isDark, t,
}: {
  branchState?: BranchState;
  prState?: PrState;
  isDark: boolean;
  t: TranslateFn;
}) {
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';

  function checkTone(status: CiCheck['status']): { style: React.CSSProperties; running: boolean } {
    if (status === 'success') return { style: { background: 'var(--intent-success-vivid)' }, running: false };
    if (status === 'failure') return { style: { background: 'var(--intent-danger-vivid)' }, running: false };
    if (status === 'cancelled') return { style: { background: 'color-mix(in srgb, var(--fg-muted) 60%, transparent)' }, running: false };
    if (status === 'queued') return { style: { background: 'color-mix(in srgb, var(--fg-muted) 60%, transparent)' }, running: false };
    return { style: { background: 'var(--intent-warn-fg)' }, running: true };
  }

  return (
    <div className="space-y-2">
      {branchState && (
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className={muted}>{t('prCi.ahead', { n: branchState.ahead })}</span>
          <span className={faint}>·</span>
          <span className={muted}>{t('prCi.behind', { n: branchState.behind })}</span>
          <span className={faint}>·</span>
          {branchState.mergeable === 'clean' ? (
            <span style={{ color: 'var(--intent-success-fg)' }}>
              ✓ {t('prCi.mergeable')}
            </span>
          ) : branchState.mergeable === 'dirty' ? (
            <span style={{ color: 'var(--intent-danger-fg)' }}>
              ⚠ {t('prCi.dirty')}
            </span>
          ) : branchState.mergeable === 'blocked' ? (
            <span style={{ color: 'var(--intent-warn-fg)' }}>
              ⊘ {t('prCi.blocked')}
            </span>
          ) : null}
        </div>
      )}

      {prState && (
        <div className={`rounded-md border ${border} p-2 space-y-1.5`}>
          <div className={`flex items-center justify-between text-[11px] font-mono ${heading}`}>
            <span>
              {prState.status === 'open' ? t('prCi.prOpen', { n: prState.number })
                : prState.status === 'draft' ? t('prCi.prDraft', { n: prState.number })
                : prState.status === 'merged' ? t('prCi.prMerged', { n: prState.number })
                : `PR #${prState.number}`}
            </span>
            <a
              href={prState.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[10px] underline opacity-70 hover:opacity-100 ${muted}`}
            >
              {t('prCi.openOnGitHub')}
            </a>
          </div>

          {prState.reviewers.length > 0 && (
            <div className="space-y-0.5">
              <div className={`text-[9px] uppercase tracking-[0.18em] ${faint}`}>
                {t('prCi.reviewers')}
              </div>
              <div className="flex flex-wrap gap-1">
                {prState.reviewers.map((r) => {
                  const toneStyle: React.CSSProperties = r.state === 'approved'
                    ? { color: 'var(--intent-success-fg)', borderColor: 'color-mix(in srgb, var(--intent-success-vivid) 30%, transparent)' }
                    : r.state === 'changes_requested'
                      ? { color: 'var(--intent-danger-fg)', borderColor: 'color-mix(in srgb, var(--intent-danger-vivid) 30%, transparent)' }
                      : {};
                  const toneClass = r.state === 'approved' || r.state === 'changes_requested'
                    ? ''
                    : (isDark ? 'text-white/55 border-white/[0.10]' : 'text-black/55 border-black/[0.10]');
                  return (
                    <span
                      key={r.handle}
                      style={toneStyle}
                      className={`inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] font-mono border ${toneClass}`}
                    >
                      {r.state === 'approved' ? '✓' : r.state === 'changes_requested' ? '⚠' : '○'}
                      {r.handle}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {prState.checks.length > 0 && (
            <div className="space-y-0.5">
              <div className={`text-[9px] uppercase tracking-[0.18em] ${faint}`}>
                {t('prCi.checks')}
              </div>
              <div className="space-y-px">
                {prState.checks.map((c, i) => {
                  const tone = checkTone(c.status);
                  return (
                    <div
                      key={`${c.name}:${i}`}
                      className={`flex items-center gap-2 text-[10px] font-mono ${muted}`}
                    >
                      <span style={tone.style} className={`coding-ci-dot ${tone.running ? 'coding-ci-dot--running' : ''}`} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className={faint}>{t(`prCi.check${c.status.charAt(0).toUpperCase() + c.status.slice(1)}`)}</span>
                      {c.durationMs != null && (
                        <span className={faint}>{(c.durationMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {prState.conflicts > 0 && (
            <div style={{ color: 'var(--intent-danger-fg)' }} className="text-[10px]">
              ⚠ {t('prCi.conflicts', { n: prState.conflicts })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntegrationRow({
  integration, isDark, t,
}: {
  integration: Integration;
  isDark: boolean;
  t: TranslateFn;
}) {
  const Icon = INTEGRATION_ICON[integration.kind];
  const labelColor = isDark ? 'text-white/85' : 'text-black/85';
  const subColor = isDark ? 'text-white/40' : 'text-black/45';
  const dotStyle: React.CSSProperties | undefined = integration.connected
    ? { background: 'var(--intent-success-vivid)' }
    : undefined;
  const dotTone = integration.connected ? '' : (isDark ? 'bg-white/20' : 'bg-black/20');

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
      isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.025]'
    } transition-colors`}>
      <Icon className={`w-3 h-3 shrink-0 ${subColor}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-semibold truncate ${labelColor}`}>
          {t(`integrations.kind.${integration.kind}`)}
        </div>
        <div className={`text-[10px] font-mono truncate ${subColor}`}>
          {integration.label}
        </div>
      </div>
      <span
        style={dotStyle}
        className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotTone} ${integration.connected ? 'animate-pulse' : ''}`}
        title={integration.connected ? t('integrations.connected') : t('integrations.disconnected')}
      />
    </div>
  );
}

function ContextSection({
  label, isDark, children,
}: {
  label: string;
  isDark: boolean;
  children: ReactNode;
}) {
  const color = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <div>
      <div className={`mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] ${color}`}>
        {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({
  label, value, mono, isDark,
}: {
  label: string;
  value: string;
  mono?: boolean;
  isDark: boolean;
}) {
  const labelColor = isDark ? 'text-white/40' : 'text-black/40';
  const valueColor = isDark ? 'text-white/85' : 'text-black/85';

  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[11px] ${labelColor}`}>{label}</span>
      <span className={`text-[11px] truncate ${mono ? 'font-mono' : ''} ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}

function ActivityRow({
  icon: Icon, text, time, isDark,
}: {
  icon: ComponentType<{ className?: string }>;
  text: string;
  time: string;
  isDark: boolean;
}) {
  const iconColor = isDark ? 'text-white/40' : 'text-black/40';
  const textColor = isDark ? 'text-white/70' : 'text-black/70';
  const timeColor = isDark ? 'text-white/30' : 'text-black/30';

  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3 h-3 shrink-0 ${iconColor}`} />
      <span className={`text-[11px] flex-1 truncate ${textColor}`}>{text}</span>
      <span className={`text-[10px] font-mono ${timeColor}`}>{time}</span>
    </div>
  );
}

