import { useEffect, useMemo, useRef, useState } from 'react';
import { Portal, ModalBackdrop, useDialogA11y } from '@shared/ui';
import { useFilterStore } from '@entities/filter-state';
import { simulateBranchDiff } from '@entities/repo';
import { previewRule, evaluateAdmission, estimateCost } from '@entities/admission';
import { useAdmissionStore } from '../../../model/store';
import { useV2 } from './tokens';
import { buildPreviewRule } from './ruleEditorTypes';
import { RuleEditorHeader } from './RuleEditorHeader';
import { RuleEditorForm } from './RuleEditorForm';
import { LivePreviewCard, RetroImpactCard, VersionHistoryCard } from './RuleEditorPreview';

// ── Rule editor (drawer) ─────────────────────────────────────────────
// Thin container: owns draft/preview state + dialog a11y, delegates the
// header, form fields, and preview/retro/history cards to parts/.

export function RuleEditorOverlay({
  editingId, onClose,
}: {
  editingId: string | null;
  onClose: () => void;
}) {
  const t = useV2();
  const draft = useAdmissionStore((s) => s.draft);
  const updateDraft = useAdmissionStore((s) => s.updateDraft);
  const saveDraft = useAdmissionStore((s) => s.saveDraft);
  const repo = useFilterStore((s) => s.repo);
  const versions = useAdmissionStore((s) => editingId ? s.versions[editingId] : undefined);
  const dialogRef = useRef<HTMLElement>(null);
  // ESC closes, Tab cycles within the drawer, autofocus first input on open,
  // restore focus to the opener when the drawer unmounts.
  useDialogA11y(dialogRef, draft !== null, onClose);

  // Hooks must run unconditionally; the early return for "no draft" is moved
  // below the hooks block. When `draft` is null we feed safe defaults into
  // the preview rule so the hooks still have valid input.
  const previewRuleObj = useMemo(() => buildPreviewRule(draft), [draft]);

  const [debounced, setDebounced] = useState(previewRuleObj);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(previewRuleObj); }, 200);
    return () => { clearTimeout(t); };
  }, [previewRuleObj]);

  const cost = estimateCost(previewRuleObj);
  const preview = useMemo(() => previewRule(debounced, repo), [debounced, repo]);
  const retroDiffs = useMemo(
    () => Array.from({ length: 12 }, (_, i) => simulateBranchDiff(repo, 700_000 + i)),
    [repo],
  );
  const retroImpact = useMemo(() => {
    let block = 0, warn = 0, pass = 0;
    for (const d of retroDiffs) {
      const dec = evaluateAdmission([previewRuleObj], repo, d);
      if (dec.blockingCount > 0) block++;
      else if (dec.warningCount > 0) warn++;
      else pass++;
    }
    return { block, warn, pass, total: retroDiffs.length };
  }, [retroDiffs, repo, previewRuleObj]);

  if (!draft) return null;

  return (
    <Portal>
      {/* Backdrop — click-to-dismiss; Escape handled by useDialogA11y. */}
      <ModalBackdrop onClick={onClose} z="z-[200]" alpha={0.55} blur="sm" label="Close" />
      {/* Drawer */}
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={editingId === null ? 'New rule' : 'Edit rule'}
        tabIndex={-1}
        className="fixed right-0 top-0 bottom-0 z-[201] flex flex-col overflow-hidden admv2-rise outline-none"
        style={{
          width: 520,
          background: t.cardBacking,
          borderLeft: `1px solid ${t.border}`,
          boxShadow: '-24px 0 60px rgba(0,0,0,0.6)',
        }}
      >
        <RuleEditorHeader
          editingId={editingId}
          cost={cost}
          versionCount={versions?.length ?? 0}
          onSave={() => saveDraft()}
          onClose={onClose}
          t={t}
        />

        <div className="flex-1 min-h-0 overflow-auto p-5 space-y-5">
          <RuleEditorForm draft={draft} updateDraft={updateDraft} t={t} />

          {/* Live preview */}
          <LivePreviewCard preview={preview} repo={repo} t={t} />

          {/* Retroactive impact */}
          <RetroImpactCard retroImpact={retroImpact} t={t} />

          {/* Version history */}
          {versions && versions.length > 0 && (
            <VersionHistoryCard versions={versions} t={t} />
          )}
        </div>
      </aside>
    </Portal>
  );
}
