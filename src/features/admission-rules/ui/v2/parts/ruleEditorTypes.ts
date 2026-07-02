import type { AdmissionRule } from '@entities/admission';
import type { EditorDraft } from '../../../model/store';

// Shared types/helpers for the RuleEditorOverlay container and its extracted
// sub-components (header, identity/scope fields, preview/retro/history cards).

// Build the live `AdmissionRule` previewed by the drawer. Hooks must run
// unconditionally, so this accepts a possibly-null draft and feeds safe
// defaults when the drawer is closed.
export function buildPreviewRule(draft: EditorDraft | null): AdmissionRule {
  return {
    id: draft?.ruleId ?? '_draft',
    name: draft?.name ?? '',
    description: draft?.description ?? '',
    source: draft?.source ?? 'native',
    severity: draft?.severity ?? 'warn',
    enabled: true,
    signal: draft?.signal ?? { kind: 'metric', field: 'blastRadius', op: '>', value: 25 },
    scope: {
      pathIncludes: (draft?.pathIncludes ?? '').split(',').map((p) => p.trim()).filter(Boolean),
      pathExcludes: (draft?.pathExcludes ?? '').split(',').map((p) => p.trim()).filter(Boolean),
      labels: [],
    },
    override: { allowAuthor: false, requiresApproverRole: null },
    evidence: 'exact',
  };
}
