import { useState } from 'react';
import {
  Eye, Wrench, ShieldCheck, FileText, Package, Bug, ScanLine, Sparkles,
  MoreHorizontal, Settings, Square, ScrollText,
} from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Toggle } from '@shared/ui/forms';

type ModelId = 'opus' | 'sonnet' | 'haiku';
type AgentId =
  | 'review-bot' | 'fix-pipeline' | 'admission-bot' | 'doc-writer'
  | 'dep-bumper' | 'flake-fixer' | 'security-scanner' | 'refactor-suggester';

type Agent = {
  id: AgentId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  model: ModelId;
  concurrency: number;
  // 7 day run counts (most-recent-last). Drives the bar chart.
  runs7d: number[];
};

const SEED: Agent[] = [
  {
    id: 'review-bot', name: 'Review bot', icon: Eye,
    description: 'Drafts PR review comments and suggestions on opened PRs.',
    enabled: true, model: 'sonnet', concurrency: 6,
    runs7d: [42, 51, 38, 47, 60, 55, 49],
  },
  {
    id: 'fix-pipeline', name: 'Fix pipeline', icon: Wrench,
    description: 'Autonomously patches failing checks and opens PRs.',
    enabled: true, model: 'opus', concurrency: 3,
    runs7d: [8, 12, 10, 14, 9, 11, 13],
  },
  {
    id: 'admission-bot', name: 'Admission bot', icon: ShieldCheck,
    description: 'Evaluates admission rules on each PR; posts the verdict.',
    enabled: true, model: 'haiku', concurrency: 12,
    runs7d: [110, 98, 121, 105, 132, 119, 124],
  },
  {
    id: 'doc-writer', name: 'Doc writer', icon: FileText,
    description: 'Updates README and inline docs when public APIs change.',
    enabled: false, model: 'sonnet', concurrency: 2,
    runs7d: [3, 5, 0, 4, 6, 2, 5],
  },
  {
    id: 'dep-bumper', name: 'Dep bumper', icon: Package,
    description: 'Opens PRs to bump dependencies, with changelog summaries.',
    enabled: true, model: 'haiku', concurrency: 4,
    runs7d: [6, 8, 5, 7, 9, 4, 7],
  },
  {
    id: 'flake-fixer', name: 'Flake fixer', icon: Bug,
    description: 'Detects flaky tests and proposes deflaking patches.',
    enabled: false, model: 'sonnet', concurrency: 2,
    runs7d: [1, 0, 2, 1, 3, 0, 1],
  },
  {
    id: 'security-scanner', name: 'Security scanner', icon: ScanLine,
    description: 'Scans diffs for vulnerable patterns and CVE-affected deps.',
    enabled: true, model: 'sonnet', concurrency: 8,
    runs7d: [25, 30, 28, 33, 27, 31, 29],
  },
  {
    id: 'refactor-suggester', name: 'Refactor suggester', icon: Sparkles,
    description: 'Spots high-churn modules and proposes structural cleanups.',
    enabled: false, model: 'opus', concurrency: 1,
    runs7d: [2, 1, 3, 2, 4, 1, 2],
  },
];

const MODEL_OPTIONS: { id: ModelId; label: string }[] = [
  { id: 'opus',   label: 'Opus' },
  { id: 'sonnet', label: 'Sonnet' },
  { id: 'haiku',  label: 'Haiku' },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(SEED);

  const setAgent = (id: AgentId, patch: Partial<Agent>) => {
    setAgents((all) => all.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const activeCount = agents.filter((a) => a.enabled).length;
  const runningNow = 7;
  const queued = 12;
  const monthlyCost = 412.55;

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title="Agents"
      subtitle="Per-workspace agent activation. Disabled agents won't be triggered by any event in this workspace."
    >
      {/* Stats band */}
      <div
        className="grid mb-6 rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Stat label="Active agents" value={`${activeCount} / ${agents.length}`} />
        <Stat label="Running now" value={String(runningNow)} accent />
        <Stat label="Queued" value={String(queued)} />
        <Stat label="Spend MTD" value={`$${monthlyCost.toFixed(2)}`} last />
      </div>

      {/* Agent table */}
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
        <div
          className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            gridTemplateColumns: '1fr 70px 110px 90px 120px 32px',
            gap: 12,
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span>Agent</span>
          <span>On</span>
          <span>Model</span>
          <span>Concurrency</span>
          <span>7-day runs</span>
          <span />
        </div>
        {agents.map((a) => (
          <AgentRow
            key={a.id}
            agent={a}
            onChange={(patch) => { setAgent(a.id, patch); }}
          />
        ))}
      </div>

      <p className="text-[11px] mt-4 px-1" style={{ color: 'var(--fg-subtle)' }}>
        Agents share the workspace token cap and inherit org-level AI policies. Concurrency is per agent, not per repo.
      </p>
    </WsShell>
  );
}

function Stat({ label, value, accent = false, last = false }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3"
      style={{ borderRight: last ? 'none' : '1px solid var(--border-muted)' }}
    >
      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <span
        className="text-[18px] font-semibold tabular-nums"
        style={{ color: accent ? 'var(--fg-accent)' : 'var(--fg-strong)' }}
      >
        {value}
      </span>
    </div>
  );
}

function AgentRow({ agent, onChange }: { agent: Agent; onChange: (patch: Partial<Agent>) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = agent.icon;
  return (
    <div
      role="row"
      className="grid items-center px-3 py-2.5 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1fr 70px 110px 90px 120px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
        opacity: agent.enabled ? 1 : 0.65,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-default)',
          }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>
            {agent.name}
          </span>
          <span className="text-[11px] leading-snug truncate" style={{ color: 'var(--fg-muted)' }}>
            {agent.description}
          </span>
        </div>
      </div>

      <Toggle checked={agent.enabled} onChange={(v) => { onChange({ enabled: v }); }} label={`Enable ${agent.name}`} />

      <select
        value={agent.model}
        disabled={!agent.enabled}
        onChange={(e) => { onChange({ model: e.target.value as ModelId }); }}
        className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      >
        {MODEL_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>

      <div
        className="flex items-center h-8 px-2 rounded-md"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
      >
        <input
          type="number"
          min={1}
          max={64}
          value={agent.concurrency}
          disabled={!agent.enabled}
          onChange={(e) => { onChange({ concurrency: Math.max(1, Number(e.target.value) || 1) }); }}
          className="w-full bg-transparent outline-none text-[12px] tabular-nums text-right"
          style={{ color: 'var(--fg-strong)' }}
        />
      </div>

      <Sparkbars data={agent.runs7d} dim={!agent.enabled} />

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => { setMenuOpen((v) => !v); }}
          className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
          style={{ color: 'var(--fg-subtle)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Row actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <RowMenu onClose={() => { setMenuOpen(false); }} />
        )}
      </div>
    </div>
  );
}

function Sparkbars({ data, dim }: { data: number[]; dim: boolean }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        // Pick a semantic colour by relative magnitude so bars read at-a-glance.
        const color =
          pct > 75 ? 'var(--intent-success-fg)'
          : pct > 35 ? 'var(--fg-accent)'
          :            'var(--fg-subtle)';
        return (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(8, pct)}%`,
              background: color,
              opacity: dim ? 0.4 : 0.85,
              minWidth: 4,
            }}
            title={`${v} runs`}
          />
        );
      })}
    </div>
  );
}

function RowMenu({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button type="button" aria-label="Dismiss menu" className="fixed inset-0 z-30 bg-transparent border-0 p-0 cursor-default" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-1 z-40 min-w-[180px] py-1 rounded-md"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <MenuItem icon={Settings} label="Configure" onClick={onClose} />
        <MenuItem icon={Square}   label="Kill all running" onClick={onClose} danger />
        <MenuItem icon={ScrollText} label="View logs" onClick={onClose} />
      </div>
    </>
  );
}

function MenuItem({
  icon: Icon, label, onClick, danger = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 h-8 text-[12px] transition-colors text-left"
      style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-default)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

