// ─────────────────────────────────────────────────────────────────────────
// EffortMeter — "how long will reviewing this honestly take?"
//
// Backed by SmartBear's review-pace research (~5 LOC/min careful pass,
// defect-finding falls past ~400 LOC and ~60 minutes). Surfacing the
// estimate up-front lets reviewers self-pace instead of starting a
// 90-minute PR with 10 minutes between meetings.
//
// Visually: a 4-segment meter (sip / cup / pot / kettle) where each
// segment lights up only when the band reaches it. We use a meter
// rather than a pill so the unfilled remainder communicates "there's
// still depth past where you are" — essentially a horizontal staircase
// instead of a single value.
// ─────────────────────────────────────────────────────────────────────────

import { Hourglass } from 'lucide-react';
import type { EffortInfo } from '../lib/insights2026';
import { EFFORT_BAND_LABEL } from '../lib/insights2026';
import { OK, SEV } from '../lib/tones';

const ORDER: EffortInfo['band'][] = ['sip', 'cup', 'pot', 'kettle'];

export default function EffortMeter({ effort }: { effort: EffortInfo }) {
  const reachedIdx = ORDER.indexOf(effort.band);
  const tone = effort.oversized ? SEV.medium : effort.band === 'kettle' ? SEV.medium : OK;

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md"
      title={`${EFFORT_BAND_LABEL[effort.band]} review · ${effort.label}${effort.oversized ? ' · oversized — consider splitting' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Hourglass className="w-3 h-3 text-white/55" strokeWidth={2} />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
        Effort
      </span>
      <span className="flex items-center gap-0.5">
        {ORDER.map((band, i) => (
          <span
            key={band}
            className="block rounded-[1px]"
            style={{
              width: 6 + i * 2,
              height: 8,
              background: i <= reachedIdx ? tone : 'rgba(255,255,255,0.12)',
              opacity: i <= reachedIdx ? 1 : 0.55,
            }}
          />
        ))}
      </span>
      <span className="text-[11px] font-mono tabular-nums" style={{ color: tone }}>
        {effort.label}
      </span>
      {effort.oversized && (
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: SEV.medium }}>
          oversized
        </span>
      )}
    </div>
  );
}
