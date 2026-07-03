// Folder inspect body — folder-scoped summary (Overview / Activity / Risk / Deps).
//
// Split from InspectPanel for SRP, then split again (mirroring WorkspaceBody):
// the four tab bodies + the shared DepRow / footer helper now live in
// folder-body/. This file is the thin container — it owns tab state, the
// memoized computeFolderStats result, and composes the tabs. Unlike the
// workspace variant, folder tabs thread an extra `folder` prop (Overview) and
// share DepRow, so those are wired through folder-body/shared.
//
// Its importer (InspectPanel) keeps working unchanged: still a default export.

import { memo, useMemo } from 'react';
import { Activity, Folder, LayoutGrid, Network, ShieldAlert } from 'lucide-react';
import type { RepoData } from '@entities/repo';
import { type Tone, formatNumber } from '@shared/lib';
import { computeFolderStats } from '@entities/metric';
import { useTranslation } from '@shared/i18n';
import { TabPanel, type TabDef } from './parts/TabPanel';
import { OverviewTab } from './folder-body/OverviewTab';
import { ActivityTab } from './folder-body/ActivityTab';
import { RiskTab } from './folder-body/RiskTab';
import { DepsTab } from './folder-body/DepsTab';
import { type FolderTab, folderTabFooter } from './folder-body/shared';

function FolderBody({ path, repo, isDark }: { path: string; repo: RepoData; isDark: boolean }) {
  const folder = repo.foldersByPath.get(path);
  const stats = useMemo(() => folder ? computeFolderStats(repo, folder) : null, [repo, folder]);
  const { t } = useTranslation('inspect');

  if (!folder || !stats) {
    return (
      <div className="p-6 text-base text-[var(--fg-muted)]">
        {t('empty.folderNotFound')}
      </div>
    );
  }

  const riskCritical = stats.vulnerable;
  const riskWarn = stats.cyclic + stats.layerViolations;

  const tabs: TabDef<FolderTab>[] = [
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
  ];

  const folderPath = folder.parts.length === 0 ? '/' : '/' + folder.parts.join('/');
  return (
    <TabPanel
      eyebrowIcon={Folder}
      eyebrowLabel={t('header.folder')}
      title={folder.name || t('tree.repo')}
      subtitle={folderPath}
      chips={
        <>
          <span
            className="px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-eyebrow tabular-nums"
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
          >
            {formatNumber(stats.totalFiles)} {t('focus.filesUnit')}
          </span>
          <span
            className="px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-eyebrow tabular-nums"
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
          >
            {formatNumber(stats.totalLoc)} {t('stat.loc')}
          </span>
        </>
      }
      tabs={tabs}
      initialTab="overview"
      renderTab={(tab) => (
        <>
          {tab === 'overview' && <OverviewTab stats={stats} folder={folder} isDark={isDark} />}
          {tab === 'activity' && <ActivityTab stats={stats} isDark={isDark} />}
          {tab === 'risk' && <RiskTab stats={stats} isDark={isDark} />}
          {tab === 'deps' && <DepsTab stats={stats} isDark={isDark} />}
        </>
      )}
      footer={(tab) => folderTabFooter(tab, stats.totalFiles, t)}
    />
  );
}

// Memoized for the same reason as WorkspaceBody: stable primitive/store
// props mean we can short-circuit re-renders triggered by sibling state.
export default memo(FolderBody);
