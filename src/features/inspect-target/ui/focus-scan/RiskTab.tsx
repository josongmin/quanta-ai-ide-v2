import { useEffect, useMemo, useState } from 'react';
import { Radio } from 'lucide-react';
import { useFilterRepo } from '@entities/filter-state';
import { useOverlay } from '@features/apply-overlay';
import {
  computeBlast, riskChannels, severityBand, aggregateRiskScore,
  type Confidence, type FileRecord, type RiskChannelKey, type RiskChannelSummary,
} from '@entities/repo';
import { C } from '@shared/lib';
import { useTranslation } from '@shared/i18n';
import { Empty, MiniStat, Note, Section, SectionHeader } from './shared';
import { HotspotSummaryCard } from './HotspotSummaryCard';

// ─── RISK: blast + risk channels (taint/race/typestate/vuln/layer) ─────
//
// "What breaks if we touch this?" — blast radius ring, taint/race/typestate/
// vuln/layer/publicApi channel grid, and either the blast hop list (default)
// or the channel-evidence drilldown when a channel is selected.
//
// Helpers used only by this tab live here: ChannelRow, ChannelHits,
// SeverityChip, FileRow, ConfDot, CHANNEL_LABEL_KEY.

export function RiskTab({ file }: { file: FileRecord }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const { setBlastSeed, clearBlast } = useOverlay();

  // Light up the dot-field stage while tab is mounted; clear on unmount.
  useEffect(() => {
    setBlastSeed(file.id);
    return () => { clearBlast(); };
  }, [file.id, setBlastSeed, clearBlast]);

  const blast = useMemo(() => computeBlast(repo, file.id, 4), [repo, file.id]);
  const channels = useMemo(() => riskChannels(file), [file]);
  const total = blast.transitive.length;
  const directCount = blast.direct.length;
  const severe = total >= 5 || aggregateRiskScore(channels) >= 0.7;
  const ringColor = severe ? C.critical : 'var(--fg-default)';

  const grouped = useMemo(() => {
    const byHop = new Map<number, number[]>();
    for (const id of blast.transitive) {
      const hop = blast.hopOf.get(id) ?? 0;
      const arr = byHop.get(hop) ?? [];
      arr.push(id);
      byHop.set(hop, arr);
    }
    return Array.from(byHop.entries()).sort((a, b) => a[0] - b[0]);
  }, [blast]);

  // Channel selection — null = show blast hop list; else swap to channel hits.
  const [selectedChannel, setSelectedChannel] = useState<RiskChannelKey | null>(null);

  return (
    <div className="space-y-4">
      <HotspotSummaryCard file={file} />

      {/* Blast ring + risk-channel grid side by side. */}
      <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
        <div className="flex flex-col items-center">
          <div
            className="relative w-20 h-20 rounded-full flex flex-col items-center justify-center"
            style={{
              border: `1.5px solid ${severe ? 'rgb(from var(--intent-danger-vivid) r g b / 0.4)' : 'var(--border-strong)'}`,
            }}
          >
            <div className="text-3xl font-black leading-none tabular-nums" style={{ color: ringColor }}>
              {total}
            </div>
            <div
              className="mt-1 text-2xs font-black uppercase tracking-eyebrow"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {t('focus.filesUnit')}
            </div>
          </div>
          <p
            className="text-xs mt-2 text-center leading-snug max-w-[100px]"
            style={{ color: 'var(--fg-muted)' }}
          >
            {t('focus.blastHeadline')}
          </p>
        </div>

        <div>
          <div
            className="flex items-center gap-1.5 mb-1.5 text-2xs font-black uppercase tracking-eyebrow"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <Radio className="w-2.5 h-2.5" />
            {t('catalog.riskChannels')}
          </div>
          <div className="space-y-1">
            {channels.map((ch) => (
              <ChannelRow
                key={ch.key}
                ch={ch}
                active={selectedChannel === ch.key}
                onSelect={() => { setSelectedChannel(selectedChannel === ch.key ? null : ch.key); }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <MiniStat label={t('stat.directDependents')} value={directCount} />
        <MiniStat label={t('stat.transitive')} value={total} />
        <MiniStat label={t('stat.publicApiHits')} value={blast.publicApiHits.length}
                  valueClass={blast.publicApiHits.length > 0 ? `text-[${C.warning}]` : ''} />
        <MiniStat label={t('stat.testHits')} value={blast.testHits.length} />
      </div>

      {/* Lower section: blast hops by default, channel evidence when selected. */}
      {selectedChannel === null ? (
        <>
          {grouped.length === 0 && (
            <Note>{t('focus.blastEmpty')}</Note>
          )}
          {grouped.map(([hop, ids]) => {
            const visible = ids.slice(0, 20);
            const overflow = ids.length - visible.length;
            return (
              <Section key={hop} title={t('focus.blastHop', { hop, count: ids.length })}>
                {visible.map((id) => {
                  const f = repo.files[id];
                  if (!f) return null;
                  return <FileRow key={id} f={f} />;
                })}
                {overflow > 0 && (
                  <div
                    className="text-xs italic px-2 py-1"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {t('focus.blastMore', { count: overflow })}
                  </div>
                )}
              </Section>
            );
          })}
          <Note>
            {t('focus.blastFooter')}
          </Note>
        </>
      ) : (
        <ChannelHits
          summary={channels.find((c) => c.key === selectedChannel)!}
        />
      )}
    </div>
  );
}

const CHANNEL_LABEL_KEY: Record<RiskChannelKey, string> = {
  taint: 'catalog.channelTaint',
  race: 'catalog.channelRace',
  typestate: 'catalog.channelTypestate',
  vuln: 'catalog.channelVuln',
  layer: 'catalog.channelLayer',
  publicApi: 'catalog.channelPublicApi',
};

function ChannelRow({
  ch, active, onSelect,
}: { ch: RiskChannelSummary; active: boolean; onSelect: () => void }) {
  const { t } = useTranslation('inspect');
  const band = severityBand(ch.severity);
  const dim = ch.count === 0;
  const toneStyle: React.CSSProperties =
    band === 'high'
      ? {
          background: 'rgb(from var(--intent-danger-vivid) r g b / 0.15)',
          color: 'var(--intent-danger-vivid)',
          borderColor: 'rgb(from var(--intent-danger-vivid) r g b / 0.30)',
        }
      : band === 'medium'
      ? {
          background: 'rgb(from var(--intent-warn-vivid) r g b / 0.15)',
          color: 'var(--intent-warn-vivid)',
          borderColor: 'rgb(from var(--intent-warn-vivid) r g b / 0.30)',
        }
      : {
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-muted)',
          borderColor: 'var(--border-default)',
        };
  return (
    <button
      type="button"
      onClick={ch.count > 0 ? onSelect : undefined}
      disabled={ch.count === 0}
      className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md border text-xs transition-colors ${
        dim ? 'opacity-50' : 'hover:brightness-110'
      } ${active ? 'ring-1' : ''}`}
      style={{
        ...toneStyle,
        ...(active ? { boxShadow: '0 0 0 1px var(--border-strong)' } : null),
      }}
    >
      <span className="font-bold uppercase tracking-eyebrow text-2xs">{t(CHANNEL_LABEL_KEY[ch.key])}</span>
      <div className="flex items-center gap-1.5">
        {ch.count > 0 ? (
          <>
            <span className="font-mono tabular-nums text-xs">{ch.count}</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={
                    i < Math.min(3, ch.count)
                      ? { background: 'currentColor' }
                      : { background: 'var(--border-default)' }
                  }
                />
              ))}
            </span>
          </>
        ) : (
          <span className="font-mono text-2xs">·</span>
        )}
      </div>
    </button>
  );
}

function ChannelHits({ summary }: { summary: RiskChannelSummary }) {
  const { t } = useTranslation('inspect');
  const name = t(CHANNEL_LABEL_KEY[summary.key]);
  return (
    <div className="space-y-1.5">
      <SectionHeader
        title={t('catalog.channelHitsTitle', { name, count: summary.count })}
      />
      {summary.hits.length === 0 && (
        <Empty>{t('catalog.riskNoIssue')}</Empty>
      )}
      {summary.hits.map((h, i) => (
        <div
          key={`${summary.key}-${i}`}
          className="px-2.5 py-1.5 rounded-md border text-xs"
          style={{
            background: 'var(--bg-surface-muted)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div className="font-mono leading-snug break-all">{h.label}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <SeverityChip severity={h.severity} />
            {h.depth !== undefined && (
              <span
                className="text-2xs font-mono"
                style={{ color: 'var(--fg-subtle)' }}
              >depth {h.depth}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeverityChip({ severity }: { severity: number }) {
  const band = severityBand(severity);
  const style: React.CSSProperties =
    band === 'high'
      ? { background: 'rgb(from var(--intent-danger-vivid) r g b / 0.20)', color: 'var(--intent-danger-vivid)' }
      : band === 'medium'
      ? { background: 'rgb(from var(--intent-warn-vivid) r g b / 0.20)', color: 'var(--intent-warn-vivid)' }
      : { background: 'rgb(from var(--intent-success-fg) r g b / 0.20)', color: 'var(--intent-success-fg)' };
  return (
    <span
      className="px-1.5 py-0.5 rounded-md font-mono text-2xs uppercase tracking-eyebrow"
      style={style}
    >
      {band} · {(severity * 100).toFixed(0)}%
    </span>
  );
}

function FileRow({ f }: { f: FileRecord }) {
  return (
    <div
      className="flex items-center justify-between px-2 py-1 rounded-md text-xs hover-surface"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      <span className="font-mono truncate">{f.folderPath}/{f.name}</span>
      <ConfDot c={f.metrics.confidence} />
    </div>
  );
}

function ConfDot({ c }: { c: Confidence }) {
  const bg = c === 'exact' ? C.ok : c === 'overapprox' ? C.warning : c === 'unknown' ? C.critical : 'var(--fg-muted)';
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bg, boxShadow: `0 0 6px ${bg}` }} title={c} />;
}
