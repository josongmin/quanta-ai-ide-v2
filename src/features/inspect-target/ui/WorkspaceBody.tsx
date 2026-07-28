// Workspace inspect body — repo-level summary (Overview / Activity / Risk / Deps).
//
// Split from InspectPanel for SRP: that file used to host two unrelated render
// trees (workspace + folder) plus eight tab subcomponents. They share neither
// state nor data, so co-locating them only made the file harder to read and
// produced cross-component churn on every edit. WorkspaceBody is now self-
// contained — it owns its tab state, its stats memo, and its tab-specific
// renderers — and InspectPanel becomes a thin dispatcher.
//
// The tab bodies + their viz primitives live in workspace-body/ (mirroring the
// focus-scan/ split convention); this file is now the thin container that
// composes them.

import { memo, useMemo } from 'react';
import { Activity, Boxes, LayoutGrid, Network, ShieldAlert, Users } from 'lucide-react';
import type { RepoData } from '@entities/repo';
import { type Tone } from '@shared/lib';
import { computeRepoStats } from '@entities/metric';
import { useTranslation, formatNumber } from '@shared/i18n';
import { OwnershipPanel } from '@features/ownership-routing';
import { TabPanel, type TabDef } from './parts/TabPanel';
import { OverviewTab } from './workspace-body/OverviewTab';
import { ActivityTab } from './workspace-body/ActivityTab';
import { RiskTab } from './workspace-body/RiskTab';
import { DepsTab } from './workspace-body/DepsTab';
import { type WorkspaceTab, tabFooter } from './workspace-body/shared';

// `isDark` is still threaded down to shared/ui primitives (TabBar, Section,
// Stat, FileRow, etc.) which are owned by a parallel migration. Once those
// primitives switch to tokens the prop can be dropped from this file in a
// follow-up. All inline color/surface/border below is now token-based.
function WorkspaceBody({ repo, isDark }: { repo: RepoData; isDark: boolean }) {
  const stats = useMemo(() => computeRepoStats(repo), [repo]);
  const { t } = useTranslation('inspect');

  // Risk badge: split into two counts so the *kind* of risk is visible
  // before the user clicks. A single "33" red badge would equate a
  // 4-vuln incident with 29 architectural debts — different urgencies.
  const riskCritical = stats.vulnerable;
  const riskWarn = stats.cyclic + stats.layerViolations;

  const tabs: TabDef<WorkspaceTab>[] = [
    { id: 'overview', label: t('tab.overview'), icon: LayoutGrid },
    { id: 'activity', label: t('tab.activity'), icon: Activity },
    {
      id: 'risk',
      label: t('tab.risk'),
      icon: ShieldAlert,
      badges: [
        // 'critical'/'warn' are verified Tone members; the mutable badge
        // property needs the Tone type (not the widened literal), so assert it.
        ...(riskCritical > 0 ? [{ n: riskCritical, tone: 'critical' as Tone }] : []),
        ...(riskWarn > 0     ? [{ n: riskWarn,     tone: 'warn'     as Tone }] : []),
      ],
    },
    { id: 'deps', label: t('tab.deps'), icon: Network },
    { id: 'ownership', label: 'Ownership', icon: Users },
  ];

  return (
    <TabPanel
      eyebrowIcon={Boxes}
      eyebrowLabel={t('header.workspace')}
      title={t('header.workspaceName')}
      subtitle={`${formatNumber(stats.files)} ${t('focus.filesUnit')} · ${formatNumber(stats.totalLoc)} ${t('stat.loc')}`}
      chips={
        <>
          <span
            className="px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-eyebrow"
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
          >
            {t('header.main')}
          </span>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-eyebrow"
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--fg-default)' }}
            />
            {t('header.fresh')}
          </span>
        </>
      }
      tabs={tabs}
      initialTab="overview"
      renderTab={(tab) => (
        <>
          {tab === 'overview' && <OverviewTab stats={stats} isDark={isDark} />}
          {tab === 'activity' && <ActivityTab stats={stats} isDark={isDark} />}
          {tab === 'risk' && <RiskTab stats={stats} isDark={isDark} />}
          {tab === 'deps' && <DepsTab stats={stats} isDark={isDark} />}
          {tab === 'ownership' && <OwnershipPanel />}
        </>
      )}
      footer={(tab) => tabFooter(tab, t)}
    />
  );
}

// WorkspaceBody re-renders whenever its parent (InspectPanel) does. Its
// props (`repo` from the zustand store, `isDark` from theme) are reference-
// stable across unrelated parent renders, so memo prevents the whole
// stats / tab tree from rebuilding when only sibling state changes.
export default memo(WorkspaceBody);
