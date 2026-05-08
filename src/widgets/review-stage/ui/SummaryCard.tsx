// ─────────────────────────────────────────────────────────────────────────
// SummaryCard — CodeRabbit/Greptile-style PR summary at the top of
// the review spine.
//
// What this surface does:
//   • One narrative paragraph, deterministic — built from the diff
//     facts, not an LLM. Reviewers can verify every claim.
//   • A confidence chip ("based on description + diff") so the
//     reviewer knows how trustable the narrative is. Trust calibration
//     is the #1 issue with AI summaries (Greptile 2025 user research).
//   • Bulleted highlights = 5 max. More than that, scan-cost beats
//     summary value.
//   • Optional "intent mismatch" callout when title/description claims
//     don't match the actual changed paths.
//
// Why above the verdict: F-pattern scan lands on the title first; we
// give the reviewer 5 seconds of "what is this PR doing?" before they
// commit to reading the diff.
// ─────────────────────────────────────────────────────────────────────────

import { AlertCircle, Sparkles } from 'lucide-react';
import type { IntentMismatch, PrSummary } from '../lib/sota';
import { OK, SEV } from '../lib/tones';
import V2Card from './V2Card';

export default function SummaryCard({
  summary, mismatch,
}: { summary: PrSummary; mismatch: IntentMismatch }) {
  const conf = summary.confidence;
  const confColor = conf >= 0.8 ? OK : conf >= 0.6 ? '#a8893a' : '#8b949e';
  const confLabel = conf >= 0.8 ? 'high' : conf >= 0.6 ? 'medium' : 'low';

  return (
    <V2Card className="p-5 relative overflow-hidden">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(122,167,212,0.12)', border: '1px solid rgba(122,167,212,0.35)' }}
        >
          <Sparkles className="w-4 h-4 text-[#7aa7d4]" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
              Synthesis
            </span>
            <span
              className="inline-flex items-center gap-1 px-1.5 h-4 rounded-sm text-[9px] font-mono uppercase tracking-[0.18em]"
              style={{ background: `${confColor}22`, color: confColor, border: `1px solid ${confColor}55` }}
              title="Confidence is high when the description and diff corroborate. Low confidence usually means the description is missing or the change is large."
            >
              {confLabel} confidence
            </span>
            <span
              className="text-[9px] font-mono text-white/40"
              title="Built from diff facts (LOC, file kinds, public-API count, prior incidents). No LLM."
            >
              · deterministic
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-white/85">
            {summary.narrative}
          </p>
          {summary.highlights.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-white/65">
              {summary.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-white/30 mt-1">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
          {mismatch.detected && (
            <div
              className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md text-[12px]"
              style={{ background: `${SEV.medium}1a`, color: SEV.medium, border: `1px solid ${SEV.medium}55` }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="text-white/85">
                <span className="font-bold" style={{ color: SEV.medium }}>Intent gap — </span>
                {mismatch.reason}
              </span>
            </div>
          )}
        </div>
      </div>
    </V2Card>
  );
}
