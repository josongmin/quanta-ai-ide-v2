import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useFilterRepo } from '@entities/filter-state';
import {
  projectEdges, type FileRecord, type GraphEdgeMode,
} from '@entities/repo';
import { C } from '@shared/lib';
import { useTranslation } from '@shared/i18n';
import { Empty, MiniStat, SectionHeader } from './shared';

// ─── GRAPH: imports / calls / dataflow / refs lens ──────────────────
//
// "What is this file wired to?" — outgoing/incoming edges through the
// selected lens. EdgeRow lives here because no other tab consumes it.

export function GraphTab({ file, reverseDeps }: { file: FileRecord; reverseDeps: number[] }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const [mode, setMode] = useState<GraphEdgeMode>('imports');

  const { outgoing, incoming } = useMemo(
    () => projectEdges(repo, file, reverseDeps, mode),
    [repo, file, reverseDeps, mode],
  );

  const modes: { key: GraphEdgeMode; labelKey: string }[] = [
    { key: 'imports',    labelKey: 'catalog.modeImports' },
    { key: 'calls',      labelKey: 'catalog.modeCalls' },
    { key: 'dataflow',   labelKey: 'catalog.modeDataflow' },
    { key: 'references', labelKey: 'catalog.modeReferences' },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t('catalog.graphTitle')}
        sub={t('catalog.graphSub', { mode: t(`catalog.mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`) })}
      />

      {/* Mode toggle */}
      <div
        className="inline-flex rounded-lg p-0.5"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {modes.map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => { setMode(m.key); }}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-[var(--track-eyebrow)] rounded-md transition-colors"
              style={
                active
                  ? { background: 'var(--bg-active)', color: 'var(--fg-strong)' }
                  : { color: 'var(--fg-subtle)' }
              }
            >
              {t(m.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <MiniStat label={t('stat.fanInOut')} value={`${file.metrics.fanIn} / ${file.metrics.fanOut}`} />
        <MiniStat label={t('stat.publicApi')} value={file.metrics.publicApi ? t('focus.yes') : t('focus.no')} />
      </div>

      <div className="space-y-3">
        <div>
          <div
            className="flex items-center gap-1.5 mb-1.5 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <ArrowUpFromLine className="w-2.5 h-2.5" />
            {t('catalog.outgoing', { count: outgoing.length })}
          </div>
          <div className="space-y-1">
            {outgoing.length === 0 && <Empty>{t('catalog.edgeNoneOut')}</Empty>}
            {outgoing.map((edge) => {
              const f = repo.files[edge.fileId];
              if (!f) return null;
              return <EdgeRow key={edge.fileId} f={f} edge={edge} />;
            })}
          </div>
        </div>
        <div>
          <div
            className="flex items-center gap-1.5 mb-1.5 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <ArrowDownToLine className="w-2.5 h-2.5" />
            {t('catalog.incoming', { count: incoming.length })}
          </div>
          <div className="space-y-1">
            {incoming.length === 0 && <Empty>{t('catalog.edgeNoneIn')}</Empty>}
            {incoming.map((edge) => {
              const f = repo.files[edge.fileId];
              if (!f) return null;
              return <EdgeRow key={edge.fileId} f={f} edge={edge} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EdgeRow({
  f, edge,
}: {
  f: FileRecord;
  edge: { confidence: 'exact' | 'overapprox' | 'unknown'; note?: string };
}) {
  const dotColor =
    edge.confidence === 'exact' ? C.ok : edge.confidence === 'overapprox' ? C.warning : C.critical;
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded-md text-[10px] hover-surface"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      <span className="font-mono truncate flex-1 min-w-0">{f.folderPath}/{f.name}</span>
      {edge.note && (
        <span
          className="shrink-0 text-[9px] italic"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {edge.note}
        </span>
      )}
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} title={edge.confidence} />
    </div>
  );
}
