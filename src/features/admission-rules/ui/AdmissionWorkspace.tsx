import { useMemo, useState } from 'react';
import { Activity, ListChecks, Gavel, History as HistoryIcon } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { GlassCard } from '@shared/ui';
import type { Tone } from '@shared/lib';
import { C , pageBackground } from '@shared/lib';
import { useFilterStore } from '@features/filter-files';
import { simulateBranchDiff } from '@entities/repo';
import { evaluateAdmission } from '@entities/admission';
import { usePrPreview } from '@features/pr-preview';
import { useAdmissionStore } from '../model/store';
import RulesBoard from './RulesBoard';
import { OverviewTab } from './OverviewTab';
import { DecisionTab } from './DecisionTab';
import { HistoryTab } from './HistoryTab';

// Layout mirrors the intelligence tab: a vertical glass sidebar on the
// left (sub-tab nav, ~240px), a centred content column with a soft
// max-width, and the page background bleeding through. Avoids the
// "stretched dashboard" feel by letting the grid breathe on either side.

type SubTab = 'overview' | 'rules' | 'decision' | 'history';

type TabDef = {
  id: SubTab;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  badges?: { n: number; tone: Tone }[];
};

export default function AdmissionWorkspace() {
  const { isDark } = useTheme();
  const [tab, setTab] = useState<SubTab>('overview');
  const rules = useAdmissionStore((s) => s.rules);
  const repo = useFilterStore((s) => s.repo);
  const { diff, seed } = usePrPreview();

  const decision = useMemo(() => {
    const effective = diff ?? simulateBranchDiff(repo, seed ?? 42);
    return evaluateAdmission(rules, repo, effective);
  }, [rules, repo, diff, seed]);

  const tabs = useMemo<TabDef[]>(() => {
    const enabled = rules.filter((r) => r.enabled).length;
    const blockBadge = decision.blockingCount > 0
      ? [{ n: decision.blockingCount, tone: 'critical' as Tone }]
      : decision.warningCount > 0
        ? [{ n: decision.warningCount, tone: 'warn' as Tone }]
        : undefined;
    return [
      { id: 'overview', label: 'Overview', hint: 'KPIs · ruleset health', icon: Activity },
      { id: 'rules',    label: 'Rules',    hint: 'Author · toggle · preview', icon: ListChecks,
        badges: [{ n: enabled, tone: 'neutral' }] },
      { id: 'decision', label: 'Decision', hint: 'Per-PR verdict', icon: Gavel, badges: blockBadge },
      { id: 'history',  label: 'History',  hint: 'Retroactive simulation', icon: HistoryIcon },
    ];
  }, [rules, decision]);

  return (
    <div
      className="absolute inset-0 flex"
      style={pageBackground(isDark)}
    >
      {/* Left sidebar — vertical sub-tab nav, glass card. */}
      <aside className="shrink-0 w-[240px] p-4 overflow-y-auto">
        <GlassCard className="p-2">
          <div className={`px-3 pt-2 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] ${
            isDark ? 'text-white/40' : 'text-black/55'
          }`}>
            Admission
          </div>
          <nav className="flex flex-col gap-1">
            {tabs.map((t) => (
              <SidebarTab
                key={t.id}
                tab={t}
                active={tab === t.id}
                isDark={isDark}
                onClick={() => { setTab(t.id); }}
              />
            ))}
          </nav>
        </GlassCard>
      </aside>

      {/* Centred content column. */}
      <main className="flex-1 min-w-0 relative overflow-hidden">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'rules'    && <RulesBoard />}
        {tab === 'decision' && <DecisionTab />}
        {tab === 'history'  && <HistoryTab />}
      </main>
    </div>
  );
}

function SidebarTab({
  tab, active, isDark, onClick,
}: {
  tab: TabDef;
  active: boolean;
  isDark: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
        active
          ? (isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]')
          : (isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.03]')
      }`}
    >
      <Icon
        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
          active
            ? (isDark ? 'text-white/85' : 'text-black/85')
            : (isDark ? 'text-white/40' : 'text-black/55')
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
            active
              ? (isDark ? 'text-white' : 'text-black')
              : (isDark ? 'text-white/55' : 'text-black/70')
          }`}>
            {tab.label}
          </span>
          {tab.badges && tab.badges.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              {tab.badges.map((b, i) => {
                const c = b.tone === 'critical' ? C.critical : b.tone === 'warn' ? C.warning : C.ok;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-black tabular-nums"
                    style={{ background: `${c}22`, color: c }}
                  >
                    {b.n}
                  </span>
                );
              })}
            </span>
          )}
        </div>
        <div className={`mt-0.5 text-[10px] font-mono truncate ${
          isDark ? 'text-white/40' : 'text-black/40'
        }`}>
          {tab.hint}
        </div>
      </div>
    </button>
  );
}
