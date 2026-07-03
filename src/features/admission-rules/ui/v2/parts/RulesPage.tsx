import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import type { PRDiff } from '@entities/repo';
import { useFilterStore } from '@entities/filter-state';
import {
  type previewRule, type evaluateAdmission,
  type AdmissionRule,
} from '@entities/admission';
import { useAdmissionStore } from '../../../model/store';
import { useV2 } from './tokens';
import { RuleEditorOverlay } from './RuleEditorOverlay';
import {
  RuleListSection, RulePacksSection, AuditSection, ImportExportSection,
} from './rules';

// ═════════════════════════════════════════════════════════════════════════
// RULES PAGE — full management surface
// Thin layout/orchestration container. Each tab's body lives in a
// single-responsibility section under `parts/rules/`. Features: list (with
// bulk select), live preview editor, packs, rollouts, versioning,
// import/export.
// ═════════════════════════════════════════════════════════════════════════

type RulesSection = 'list' | 'packs' | 'audit' | 'io';

export function RulesPage({
  rules, previews, retro,
}: {
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const t = useV2();
  const repo = useFilterStore((s) => s.repo);
  const [section, setSection] = useState<RulesSection>('list');
  const editingId = useAdmissionStore((s) => s.editingId);
  const draft = useAdmissionStore((s) => s.draft);
  const closeEditor = useAdmissionStore((s) => s.closeEditor);

  return (
    <div className="relative min-h-full p-6 pt-10 flex flex-col gap-5">
      {/* Page heading */}
      <div className="flex items-center gap-3 admv2-rise">
        <ListChecks className="w-4 h-4" style={{ color: t.textMuted }} />
        <h1 className="text-base font-bold uppercase tracking-eyebrow" style={{ color: t.textBody }}>
          Rule management
        </h1>
        <span className="text-xs font-mono" style={{ color: t.textSubtle }}>
          author · simulate · roll out
        </span>
        <div className="flex-1" />
        <SectionTabs section={section} onChange={setSection} />
      </div>

      {section === 'list' && (
        <RuleListSection rules={rules} previews={previews} retro={retro} repo={repo} />
      )}
      {section === 'packs' && <RulePacksSection />}
      {section === 'audit' && <AuditSection />}
      {section === 'io' && <ImportExportSection />}

      {/* Floating editor drawer */}
      {draft !== null && (
        <RuleEditorOverlay
          editingId={editingId}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

function SectionTabs({
  section, onChange,
}: {
  section: RulesSection;
  onChange: (s: RulesSection) => void;
}) {
  const t = useV2();
  const opts: { id: RulesSection; label: string }[] = [
    { id: 'list',  label: 'Rules' },
    { id: 'packs', label: 'Packs' },
    { id: 'audit', label: 'Audit' },
    { id: 'io',    label: 'Import / Export' },
  ];
  return (
    <div
      className="flex items-center gap-px rounded-md overflow-hidden"
      style={{ background: t.inset, border: `1px solid ${t.borderSoft}` }}
    >
      {opts.map((o) => {
        const active = section === o.id;
        return (
          <button type="button"
            key={o.id}
            onClick={() => { onChange(o.id); }}
            className="px-3 py-1 text-xs font-bold uppercase tracking-eyebrow transition-colors"
            style={{
              background: active ? t.hoverActive : 'transparent',
              color: active ? t.textHi : t.textSubtle,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = t.textBody; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = t.textSubtle; }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
