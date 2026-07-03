import { Layers } from 'lucide-react';
import { useAdmissionStore } from '../../../../model/store';
import { SOURCE_GLYPH } from '../../../sourceStyle';
import { useV2 } from '../tokens';
import { V2Card } from '../primitives';

// ── Rule packs ───────────────────────────────────────────────────────

export function RulePacksSection() {
  const t = useV2();
  const packs = useAdmissionStore((s) => s.packs);
  const rules = useAdmissionStore((s) => s.rules);
  const togglePack = useAdmissionStore((s) => s.togglePack);
  const packIsActive = useAdmissionStore((s) => s.packIsActive);

  return (
    <div className="grid grid-cols-2 gap-4">
      {packs.map((pack) => {
        const active = packIsActive(pack.id);
        const memberRules = rules.filter((r) => pack.ruleIds.includes(r.id));
        const enabledMembers = memberRules.filter((r) => r.enabled).length;
        return (
          <V2Card
            key={pack.id}
            className="p-5 cursor-pointer transition-all hover:scale-[1.005]"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: active
                    ? `linear-gradient(140deg, ${t.accent}4d, ${t.accent}0d)`
                    : t.inset,
                  border: `1px solid ${active ? `${t.accent}8c` : t.border}`,
                  boxShadow: active ? `0 0 16px ${t.accent}40` : 'none',
                }}
              >
                <Layers className="w-4 h-4" style={{ color: active ? t.accent : t.textMuted }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold uppercase tracking-eyebrow" style={{ color: t.textHi }}>
                    {pack.name}
                  </span>
                  <span
                    className="text-2xs font-mono uppercase tracking-eyebrow px-1.5 py-px rounded-md"
                    style={{ color: t.textSubtle, background: t.inset }}
                  >
                    {pack.source}
                  </span>
                </div>
                <div className="mt-0.5 text-sm font-mono" style={{ color: t.textMuted }}>
                  {pack.description}
                </div>
              </div>
              <button type="button"
                onClick={() => { togglePack(pack.id); }}
                className="shrink-0 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-eyebrow transition-colors"
                style={{
                  background: active ? t.accent : t.inset,
                  color: active ? t.page : t.textBody,
                  border: `1px solid ${active ? t.accent : t.border}`,
                }}
              >
                {active ? 'Activated' : 'Activate'}
              </button>
            </div>

            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.borderSoft}` }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xs font-bold uppercase tracking-eyebrow" style={{ color: t.textSubtle }}>
                  {enabledMembers} / {memberRules.length} active
                </span>
                <div className="flex-1 h-px" style={{ background: t.borderSoft }} />
              </div>
              <div className="space-y-1">
                {memberRules.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm font-mono">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: r.enabled ? t.ok : t.textFaint }}
                    />
                    <span style={{ color: r.enabled ? t.textBody : t.textSubtle }}>
                      {SOURCE_GLYPH[r.source]} {r.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </V2Card>
        );
      })}
    </div>
  );
}
