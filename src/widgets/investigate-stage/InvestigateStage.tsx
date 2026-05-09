import { useMemo, useState, type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';

import { buildRepo, type RepoData } from '@entities/repo';
import { computeHotspots, type HotspotEntry } from '@entities/hotspot';
import { computeCouplingClusters, groupClusters } from '@entities/temporal-coupling';
import { MOCK_SUSPECTS } from '@entities/suspect';

import {
  TriageRail,
  selectTopHotspots,
  selectNewlyEntering,
  selectDeteriorating,
  selectSeamCandidates,
} from '@features/hotspot-triage-rail';
import {
  SuspectRankingCard,
  CounterEvidencePanel,
} from '@features/suspect-ranking';
import { IssueCodeOverlay } from '@features/incident-overlay';
import { FixModePanel } from '@features/triage-handoff';
import {
  ChangeSeedPanel,
  BlastRadiusMap,
  PlanTab,
  buildImpactGraph,
  planSafeChange,
  MOCK_ADJACENCY,
  MOCK_SEEDS,
} from '@features/change-planner';
import { useInvestigation } from '@features/investigation';
import { GlassCard } from '@shared/ui';
import { QuickInvestigateSection } from './parts';

function deriveCouplingsFromRepo(repo: RepoData) {
  // Build pseudo-commits from file pairs that share folders, so we have
  // something to feed coupling computation in the demo.
  const byFolder = new Map<string, number[]>();
  for (const file of repo.files) {
    const folder = file.folderPath;
    const arr = byFolder.get(folder) ?? [];
    arr.push(file.id);
    byFolder.set(folder, arr);
  }
  const commits: Array<{ files: number[] }> = [];
  for (const ids of byFolder.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < Math.min(ids.length, 6); i++) {
      commits.push({ files: ids.slice(i, i + 3).filter(Boolean) });
    }
  }
  const edges = computeCouplingClusters(commits, 0.4);
  return groupClusters(edges);
}

export default function InvestigateStage() {
  const repo = useMemo(() => buildRepo(), []);
  const hotspots = useMemo(() => {
    const map = computeHotspots(repo);
    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  }, [repo]);

  const couplings = useMemo(() => deriveCouplingsFromRepo(repo), [repo]);

  const top = useMemo(() => selectTopHotspots(hotspots, 10), [hotspots]);
  const newlyEntering = useMemo<HotspotEntry[]>(() => selectNewlyEntering([], hotspots), [hotspots]);
  const deteriorating = useMemo<HotspotEntry[]>(() => {
    const synthPrev = hotspots.map((h) => ({ ...h, score: h.score * 0.8 }));
    return selectDeteriorating(synthPrev, hotspots);
  }, [hotspots]);
  const seamCandidates = useMemo(
    () => selectSeamCandidates(hotspots, couplings),
    [hotspots, couplings],
  );

  const fileLabel = (id: number) => {
    const f = repo.files[id];
    return f ? `${f.folderPath}/${f.name}` : `file#${id}`;
  };

  const incidentIds = Object.keys(MOCK_SUSPECTS);
  const [incidentId, setIncidentId] = useState(incidentIds[0] ?? '');
  const ranking = MOCK_SUSPECTS[incidentId];
  const focusSuspect = ranking?.suspects[0] ?? null;

  const [seedId, setSeedId] = useState(MOCK_SEEDS[0]?.id ?? '');
  const seed = MOCK_SEEDS.find((s) => s.id === seedId) ?? MOCK_SEEDS[0];
  const plan = useMemo(() => {
    if (!seed) return null;
    const graph = buildImpactGraph(seed, MOCK_ADJACENCY);
    return { graph, plan: planSafeChange(graph) };
  }, [seed]);

  return (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <WorkspaceLauncherCard />

        <header className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.18em] font-black" style={{ color: 'var(--fg-subtle)' }}>
            investigate
          </div>
          <div className="text-[18px] font-bold" style={{ color: 'var(--fg-strong)' }}>
            Hotspots · Suspects · Safe-change planner
          </div>
        </header>

        <QuickInvestigateSection
          topHotspots={top}
          fileLabel={fileLabel}
          incidentIds={incidentIds}
        />

        <Section title="Hotspot triage">
          <TriageRail
            top={top}
            newlyEntering={newlyEntering}
            deteriorating={deteriorating}
            seamCandidates={seamCandidates}
            fileLabel={fileLabel}
          />
        </Section>

        <Section title="Suspect commits">
          <div className="flex items-center gap-2 mb-3">
            {incidentIds.map((id) => (
              <button
                key={id}
                onClick={() => setIncidentId(id)}
                className="px-3 h-7 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] border transition-colors"
                style={{
                  borderColor: 'var(--border-default)',
                  background: id === incidentId ? 'var(--bg-surface-strong)' : 'transparent',
                  color: id === incidentId ? 'var(--fg-strong)' : 'var(--fg-subtle)',
                }}
              >
                {id}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              {ranking && <SuspectRankingCard ranking={ranking} />}
            </div>
            <div className="space-y-4">
              {focusSuspect && <CounterEvidencePanel suspect={focusSuspect} />}
              <FixModePanel onAction={() => undefined} recommended="investigate" />
            </div>
          </div>
          <div className="mt-4">
            <IssueCodeOverlay
              stackHits={[
                'src/auth/session.ts:42',
                'src/auth/refresh.ts:88',
              ]}
              transitiveHits={[
                'src/api/middleware/authGuard.ts',
                'src/routes/loginHandler.ts',
              ]}
            />
          </div>
        </Section>

        <Section title="Safe-change planner">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <ChangeSeedPanel
                seeds={MOCK_SEEDS}
                selectedId={seedId}
                onSelect={setSeedId}
              />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {plan && <BlastRadiusMap graph={plan.graph} />}
              {plan && <PlanTab plan={plan.plan} />}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2
        className="text-[11px] uppercase tracking-[0.18em] font-black"
        style={{ color: 'var(--fg-default)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function WorkspaceLauncherCard() {
  const { openPanel, panelOpen } = useInvestigation();

  const iconWrap: CSSProperties = {
    background: 'var(--bg-surface-strong)',
    border: '1px solid var(--border-default)',
    color: 'var(--fg-strong)',
  };

  const btnStyle: CSSProperties = {
    background: 'var(--bg-surface-strong)',
    color: 'var(--fg-strong)',
    border: '1px solid var(--border-default)',
    fontSize: '11px',
  };

  return (
    <GlassCard className="rounded-lg">
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className="inline-flex items-center justify-center rounded-md"
          style={{ ...iconWrap, width: 28, height: 28 }}
        >
          <Sparkles size={14} aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="text-[12px] font-black uppercase tracking-[0.16em]"
            style={{ color: 'var(--fg-strong)' }}
          >
            AI Investigation Workspace
          </div>
          <div
            className="text-[11px]"
            style={{ color: 'var(--fg-muted)' }}
          >
            Ask grounded questions about any file, symbol, or incident — answers come with cited evidence.
          </div>
        </div>
        <button
          type="button"
          onClick={openPanel}
          style={btnStyle}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md font-bold uppercase tracking-[0.14em] hover:[background:var(--bg-hover)]"
        >
          <Sparkles size={12} aria-hidden="true" />
          {panelOpen ? 'Show workspace' : 'Open workspace'}
        </button>
      </div>
    </GlassCard>
  );
}
