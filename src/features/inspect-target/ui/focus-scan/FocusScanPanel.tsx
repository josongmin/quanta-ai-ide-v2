import { useMemo, useState } from 'react';
import { ScrollText, Sparkles, Network, FileSearch, ShieldAlert } from 'lucide-react';
import { useFilterRepo } from '@features/filter-files';
import type { FileRecord } from '@entities/repo';
import { GlassCard, Portal } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import { Badge } from './shared';
import { SimilarDrawer } from './SimilarDrawer';
import { ProfileTab } from './ProfileTab';
import { GraphTab } from './GraphTab';
import { RiskTab } from './RiskTab';
import { ProofTab } from './ProofTab';

// Spec §2 Focus Scan + Catalog (docs/catalog-algorithms-listing.md). The new
// 4-tab layout collapses the old Overview/Calls/Impact/Blast/Refactor/Evidence
// rail into Profile · Graph · Risk · Proof so each tab maps to a clear DXUX
// question:
//   PROFILE — what is this file?              (function_summary, refactor verdict)
//   GRAPH   — what is it wired to?            (call_graph / dataflow / refs lens toggle)
//   RISK    — what breaks if we touch it?     (blast + taint + race + typestate channels)
//   PROOF   — why should we trust this?       (planner trace, freshness, replay capsule)
// Similar-files is demoted from a tab into a header action since it's a
// single capability and shouldn't compete with the four pillars above.

type TabId = 'profile' | 'graph' | 'risk' | 'proof';

const TABS: { id: TabId; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', labelKey: 'tab.profile', icon: FileSearch },
  { id: 'graph',   labelKey: 'tab.graph',   icon: Network },
  { id: 'risk',    labelKey: 'tab.risk',    icon: ShieldAlert },
  { id: 'proof',   labelKey: 'tab.proof',   icon: ScrollText },
];

// `isDark` is retained on the public API so parallel call-sites compile, but
// all colour decisions inside this panel now flow through theme-aware CSS
// variables. The prop is no longer read internally.
export default function FocusScanPanel({
  file, embedded = false,
}: { file: FileRecord; isDark?: boolean; onClose?: () => void; embedded?: boolean }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const { t: tc } = useTranslation('common');
  const [tab, setTab] = useState<TabId>('profile');
  const [similarOpen, setSimilarOpen] = useState(false);

  // Reverse deps once per file selection.
  const reverseDeps = useMemo(() => {
    const ins: number[] = [];
    for (const f of repo.files) if (f.deps.includes(file.id)) ins.push(f.id);
    return ins;
  }, [repo, file.id]);

  // `overflow: hidden` on the GlassCard root kills `backdrop-filter` in
  // Chromium (the element becomes its own paint container with no backdrop
  // to read). Keep the clip on an inner wrapper instead — see InspectPanel.
  const card = (
    <GlassCard
      className={`flex flex-col h-full ${embedded ? '' : 'max-h-[calc(100vh-130px)]'}`}
    >
     <div className="flex flex-col h-full overflow-hidden" style={{ borderRadius: 'inherit' }}>
      <header
        className="shrink-0 px-5 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-[13px] truncate tracking-tight">{file.name}</h2>
            <p
              className="text-[10px] font-mono truncate mt-0.5"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {file.folderPath}/{file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSimilarOpen((v) => !v); }}
            title={t('catalog.openSimilar')}
            className="shrink-0 p-1.5 rounded-md transition-colors hover-surface"
            style={
              similarOpen
                ? { background: 'var(--bg-active)', color: 'var(--fg-strong)' }
                : { background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }
            }
          >
            <Sparkles className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <Badge kind={file.status}>{tc(`status.${file.status}`).toUpperCase()}</Badge>
          <Badge kind="confidence" conf={file.metrics.confidence}>
            {file.metrics.confidence.toUpperCase()}
          </Badge>
          <Badge kind="safety" safety={file.metrics.editSafety}>
            {t('focus.safetyLabel')} {file.metrics.editSafety}
          </Badge>
        </div>
      </header>

      {/* Similar files drawer — opens from the Sparkles header button */}
      {similarOpen && (
        <SimilarDrawer file={file} onClose={() => { setSimilarOpen(false); }} />
      )}

      {/* Tabs — 4 pillars */}
      <nav
        className="shrink-0 overflow-x-auto scrollbar-hide border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-stretch gap-3 px-4 min-w-max">
          {TABS.map(({ id, labelKey, icon: Icon }) => {
            const active = tab === id;
            return (
              <button type="button"
                key={id}
                onClick={() => { setTab(id); }}
                className="relative flex items-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] whitespace-nowrap transition-colors"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-subtle)' }}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{t(labelKey)}</span>
                {active && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-[1.5px]"
                    style={{ background: 'var(--fg-strong)' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 scrollbar-hide text-[11px]">
        {tab === 'profile' && <ProfileTab file={file} />}
        {tab === 'graph'   && <GraphTab   file={file} reverseDeps={reverseDeps} />}
        {tab === 'risk'    && <RiskTab    file={file} />}
        {tab === 'proof'   && <ProofTab   file={file} />}
      </div>

      <footer
        className="shrink-0 px-5 py-2.5 border-t text-[9px] font-mono uppercase tracking-[0.18em]"
        style={{ borderColor: 'var(--border-default)', color: 'var(--fg-subtle)', opacity: 0.7 }}
      >
        {t('footer.focusScan', { state: file.metrics.indexState })}
      </footer>
     </div>
    </GlassCard>
  );

  if (embedded) return card;

  return (
    <Portal>
      <div className="fixed top-[68px] right-4 z-30 w-[360px] max-h-[calc(100vh-84px)] pointer-events-auto">
        {card}
      </div>
    </Portal>
  );
}
