import { useMemo } from 'react';
import { plannerTrace, proofFreshness, type FileRecord } from '@entities/repo';
import { C } from '@shared/lib';
import { useTranslation } from '@shared/i18n';
import { SectionHeader } from './shared';

// ─── PROOF: planner trace + freshness + replay capsule ──────────────
//
// "Why should we trust this?" — trust strip (freshness/envelope/replay),
// planner trace of which algorithms were tried, witness/evidence lines,
// and an optional verify-bundle action when an envelope is available.

export function ProofTab({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const fresh = useMemo(() => proofFreshness(file), [file]);
  const trace = useMemo(() => plannerTrace(file), [file]);
  const lines = useMemo(() => buildEvidenceTrace(file, t), [file, t]);

  const trustColor =
    fresh.trust === 'green' ? C.ok :
    fresh.trust === 'amber' ? C.warning : C.critical;

  return (
    <div className="space-y-4">
      {/* Trust strip */}
      <div
        className="grid grid-cols-2 gap-2 px-3 py-2.5 rounded-xl border text-[10px]"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.proofTrust')}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: trustColor, boxShadow: `0 0 6px ${trustColor}` }} />
            <span className="font-bold uppercase">{fresh.trust}</span>
          </div>
        </div>
        <div>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.proofFreshness')}
          </div>
          <div className="mt-0.5 font-mono">{fresh.freshnessClass}</div>
        </div>
        <div>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.proofEnvelope')}
          </div>
          <div className="mt-0.5 font-bold">{fresh.verifiedEnvelope ? t('focus.yes') : t('focus.no')}</div>
        </div>
        <div>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.proofReplay')}
          </div>
          <div className="mt-0.5 font-bold">{fresh.replayAvailable ? t('focus.yes') : t('focus.no')}</div>
        </div>
      </div>

      {/* Planner trace */}
      <div>
        <SectionHeader
          title={t('catalog.plannerTrace')}
          sub={t('catalog.plannerTraceSub')}
        />
        <div className="mt-1.5 space-y-1">
          {trace.map((c, i) => (
            <PlannerRow key={`${c.capability}-${c.algorithm}-${i}`} cand={c} />
          ))}
        </div>
      </div>

      {/* Witness lines (legacy evidence trace) */}
      <div>
        <div
          className="text-[9px] uppercase tracking-[0.18em] mb-2"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('focus.evidenceTrace')}
        </div>
        <div className="space-y-1 font-mono text-[10px]">
          {lines.map((l, i) => (
            <div key={l} className="flex gap-2" style={{ color: 'var(--fg-muted)' }}>
              <span
                className="shrink-0 w-5 text-right"
                style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
              >{i + 1}</span>
              <span className="flex-1">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {fresh.verifiedEnvelope && (
        <button
          type="button"
          className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.18em] transition-colors hover:brightness-110"
          style={{
            background: 'rgb(from var(--intent-success-vivid) r g b / 0.15)',
            color: 'var(--intent-success-fg)',
            border: '1px solid rgb(from var(--intent-success-vivid) r g b / 0.30)',
          }}
        >
          {t('catalog.verifyBundle')}
        </button>
      )}

      <div
        className="mt-1 p-2.5 rounded-lg border text-[10px]"
        style={
          file.metrics.confidence === 'exact'
            ? {
                background: 'rgb(from var(--intent-success-vivid) r g b / 0.10)',
                borderColor: 'rgb(from var(--intent-success-vivid) r g b / 0.30)',
                color: 'var(--intent-success-fg)',
              }
            : {
                background: 'rgb(from var(--intent-warn-vivid) r g b / 0.10)',
                borderColor: 'rgb(from var(--intent-warn-vivid) r g b / 0.30)',
                color: 'var(--intent-warn-fg)',
              }
        }
      >
        {t('focus.resultIs')} <b>{file.metrics.confidence}</b>. {file.metrics.confidence === 'exact'
          ? t('focus.evidenceConverged')
          : t('focus.evidenceApproximate')}
      </div>
    </div>
  );
}

function PlannerRow({
  cand,
}: {
  cand: { algorithm: string; capability: string; selected: boolean; reason: string; precisionClass: 'exact' | 'overapprox' | 'unknown' };
}) {
  const { t } = useTranslation('inspect');
  const dotColor = cand.precisionClass === 'exact' ? C.ok : cand.precisionClass === 'overapprox' ? C.warning : C.critical;
  return (
    <div
      className="px-2 py-1.5 rounded-md border text-[10px]"
      style={
        cand.selected
          ? { background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }
          : { background: 'var(--bg-surface-muted)', borderColor: 'var(--border-muted)', opacity: 0.65 }
      }
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="font-mono font-bold flex-1 truncate">{cand.algorithm}</span>
        <span
          className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em]"
          style={
            cand.selected
              ? { background: 'rgb(from var(--intent-success-fg) r g b / 0.20)', color: 'var(--intent-success-fg)' }
              : { background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }
          }
        >
          {cand.selected ? t('catalog.plannerSelected') : t('catalog.plannerRejected')}
        </span>
      </div>
      <div
        className="mt-0.5 ml-3.5 font-mono text-[9px]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {cand.capability} · <span className="italic">{cand.reason}</span>
      </div>
    </div>
  );
}

function buildEvidenceTrace(f: FileRecord, t: (k: string, opts?: Record<string, unknown>) => string): string[] {
  const lines: string[] = [];
  lines.push(t('evidence.indexedAt', { days: f.metrics.daysSinceTouched, state: f.metrics.indexState }));
  lines.push(t('evidence.detectedLanguage', { language: f.language, layer: f.layer, owner: f.owner }));
  if (f.metrics.cyclic) lines.push(t('evidence.importCycle'));
  if (f.metrics.fanIn > 0) lines.push(t('evidence.reverseRefs', { count: f.metrics.fanIn }));
  if (f.metrics.unknownReasons.length > 0) {
    for (const r of f.metrics.unknownReasons) lines.push(t('evidence.fallback', { reason: r }));
  }
  if (f.metrics.security) lines.push(t('evidence.sastFlagged'));
  if (f.metrics.publicApi) lines.push(t('evidence.publicApi'));
  lines.push(t('evidence.coverage', { line: f.metrics.lineCoverage, branch: f.metrics.branchCoverage, mut: f.metrics.mutationScore }));
  lines.push(t('evidence.editSafety', { value: f.metrics.editSafety }));
  return lines;
}
