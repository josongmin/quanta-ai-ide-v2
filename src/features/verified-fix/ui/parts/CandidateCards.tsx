import { Check, X, FileText, GitBranch, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { CandidateFix, DeliveryTier } from '../../model/types';
import { useVfx, tierColor } from './tokens';

const TIER_KEY: Record<DeliveryTier, string> = {
  'safe-mechanical': 'tier.safeMechanical',
  'guarded':         'tier.guarded',
  'human-required':  'tier.humanRequired',
};

export function CandidateCards({
  candidates, selectedId, dismissedIds, onSelect,
}: {
  candidates: CandidateFix[];
  selectedId: string | null;
  dismissedIds: string[];
  onSelect: (id: string) => void;
}) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const visible = candidates.filter((c) => !dismissedIds.includes(c.id));

  if (visible.length === 0) {
    return (
      <div
        className="rounded-lg border px-4 py-8 text-center"
        style={{ background: t.cardBacking, borderColor: t.border, color: t.textFaint }}
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.16em]">
          {tr('candidates.noViableTitle')}
        </div>
        <div className="text-[10.5px] mt-1.5" style={{ color: t.textMuted }}>
          {tr('candidates.noViableBody')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: t.textMuted }}
        >
          {tr('candidates.header', { count: visible.length })}
        </span>
        <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
          {tr('candidates.subtitle')}
        </span>
      </div>
      <div className={`grid gap-3 ${visible.length === 1 ? 'grid-cols-1' : visible.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {visible.map((c) => {
          const tc = tierColor(t, c.tier);
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c.id); }}
              className="text-left rounded-lg border transition-all relative"
              style={{
                background: t.cardBacking,
                borderColor: active ? t.accent + '70' : t.border,
                boxShadow: active
                  ? `0 0 0 1px ${t.accent}40, 0 6px 24px -8px ${t.accent}30`
                  : 'none',
              }}
            >
              <div className="p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                    style={{ background: tc.bg, color: tc.fg }}
                  >
                    {tr(TIER_KEY[c.tier])}
                  </span>
                  {c.publicApiChange && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                      style={{ background: t.warnSoft, color: t.warn }}
                    >
                      <ShieldAlert className="w-2.5 h-2.5" /> {tr('candidates.apiBreak')}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] font-mono" style={{ color: t.textFaint }}>
                    {Math.round(c.confidence * 100)}%
                  </span>
                </div>

                <div
                  className="text-[12.5px] leading-snug font-semibold mb-1.5"
                  style={{ color: t.textHi }}
                >
                  {c.title}
                </div>

                <div
                  className="text-[10.5px] leading-snug mb-2.5"
                  style={{ color: t.textMuted }}
                >
                  {c.rationale}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  <Stat icon={FileText}  label={tr('candidates.stat.lines')} value={c.changedLines} />
                  <Stat icon={FileText}  label={tr('candidates.stat.files')} value={c.changedFiles} />
                  <Stat icon={GitBranch} label={tr('candidates.stat.blast')} value={c.blastModules} />
                </div>

                <div className="space-y-1">
                  {c.pros.slice(0, 2).map((p, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10.5px]">
                      <Check className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: t.ok }} />
                      <span style={{ color: t.textBody }}>{p}</span>
                    </div>
                  ))}
                  {c.cons.slice(0, 1).map((p, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10.5px]">
                      <X className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: t.bad }} />
                      <span style={{ color: t.textMuted }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* confidence bar */}
              <div
                className="h-[3px] rounded-b-lg overflow-hidden"
                style={{ background: t.borderHair }}
              >
                <div
                  style={{
                    width: `${Math.round(c.confidence * 100)}%`,
                    background: tc.fg,
                    height: '100%',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: {
  icon: LucideIcon;
  label: string; value: number;
}) {
  const t = useVfx();
  return (
    <div
      className="rounded px-2 py-1.5 border"
      style={{ background: t.inset, borderColor: t.borderHair }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="w-2.5 h-2.5" style={{ color: t.textFaint }} />
        <span
          className="text-[8.5px] font-bold uppercase tracking-[0.14em]"
          style={{ color: t.textFaint }}
        >
          {label}
        </span>
      </div>
      <div className="text-[14px] font-bold font-mono" style={{ color: t.textHi }}>
        {value}
      </div>
    </div>
  );
}
