import { Eye } from 'lucide-react';
import {
  estimateCost,
  type previewRule, type evaluateAdmission,
  type AdmissionRule,
} from '@entities/admission';
import { SOURCE_GLYPH, usesHint, describeSignal } from '../../../sourceStyle';
import { SEVERITY_COLOR, useV2 } from '../tokens';

export function RuleInspector({
  rule, preview, evalResult,
}: {
  rule: AdmissionRule;
  preview: ReturnType<typeof previewRule> | null;
  evalResult: ReturnType<typeof evaluateAdmission>['ruleResults'][number] | null;
}) {
  const t = useV2();
  const cost = estimateCost(rule);
  const sevColor = rule.severity === 'block' ? SEVERITY_COLOR.block
    : rule.severity === 'warn' ? SEVERITY_COLOR.warn : t.textMuted;
  const fired = evalResult && (evalResult.status === 'block' || evalResult.status === 'warn');
  const dotColor = rule.enabled ? sevColor : t.textFaint;
  return (
    <div className="flex items-start gap-3 admv2-rise">
      <span className="relative shrink-0 mt-1 inline-flex items-center justify-center w-3 h-3">
        {rule.enabled && rule.severity !== 'info' && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: sevColor, opacity: 0.18, filter: 'blur(2px)' }}
          />
        )}
        <span
          className="relative w-2 h-2 rounded-full"
          style={{
            background: dotColor,
            boxShadow: rule.enabled && rule.severity === 'block' ? `0 0 0 2px ${sevColor}33` : 'none',
          }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
            {SOURCE_GLYPH[rule.source]} {rule.source}
          </span>
          <span style={{ color: t.textFaint }}>·</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
            style={{ color: sevColor, background: `${sevColor}1a` }}
          >
            {rule.severity}
          </span>
          <span style={{ color: t.textFaint }}>·</span>
          <span className="text-[10px] font-mono" style={{ color: t.textMuted }}>{cost}</span>
          {fired && (
            <span
              className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md"
              style={{ color: sevColor, background: `${sevColor}22`, border: `1px solid ${sevColor}55` }}
            >
              fired in PR
            </span>
          )}
        </div>
        <div className="mt-1 text-[14px] font-bold truncate" style={{ color: t.textBody }}>
          {rule.name}
        </div>
        <div className="mt-0.5 text-[11px] font-mono truncate" style={{ color: t.textSubtle }}>
          uses {usesHint(rule.signal)} · {describeSignal(rule.signal)}
        </div>
        {preview && (
          <div className="mt-2 flex items-center gap-3 text-[10px] font-mono" style={{ color: t.textMuted }}>
            <span>{preview.matches.length} repo-wide</span>
            <span style={{ color: t.textFaint }}>·</span>
            <span style={{ color: t.textBody }}>{preview.confidenceMix.exact} exact</span>
            <span>{preview.confidenceMix.overapprox} over</span>
            <span style={{ color: t.textSubtle }}>{preview.confidenceMix.unknown} unk</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyInspector() {
  const t = useV2();
  return (
    <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: t.textSubtle }}>
      <Eye className="w-3.5 h-3.5" />
      Hover a node to inspect signal, cost, and evidence.
    </div>
  );
}
