import type { AdmissionRuleCore } from '../model';

// Canonical admission-rules seed shared by the org Policies page and the
// per-workspace Admission page. Holds only the display core (id/title/
// description/category) — each page maps these into its own row shape and
// attaches page-specific tail fields (org default/effective severity, or the
// per-workspace rollout counters). Icons are resolved in the pages by id.
//
// Where the two pages historically rendered slightly different copy for the
// same id (e.g. the ≥2-approvers wording), the page keeps a local override so
// rendered text is preserved exactly; the common text lives here.

export const SEED_ADMISSION_RULES: AdmissionRuleCore[] = [
  { id: 'r-secrets', title: 'No secrets in diff',
    description: 'Block any push that introduces a credential matching the secret-scanner ruleset.',
    category: 'secrets' },

  { id: 'r-2-approvers', title: 'Require >=2 approvers',
    description: 'Production branches need at least two human approvals.',
    category: 'review' },

  { id: 'r-owner-review', title: 'CODEOWNERS must approve',
    description: 'Any modified path that has owners requires at least one owner approval.',
    category: 'review' },

  { id: 'r-tests-pass', title: 'Tests must pass',
    description: 'Any failing or skipped required test on the default branch blocks merge.',
    category: 'tests' },

  { id: 'r-coverage', title: 'Coverage cannot regress >2%',
    description: 'Compare against last green commit on the same branch.',
    category: 'tests' },

  { id: 'r-license', title: 'Disallow GPL dependencies',
    description: 'Block PRs adding any dependency with a GPL-family license.',
    category: 'deps' },

  { id: 'r-stale-deps', title: 'Warn on deps >365 days behind',
    description: 'Surface a soft warning during review; does not block merge.',
    category: 'deps' },

  { id: 'r-no-prod-config', title: 'No prod config edits without label',
    description: 'Edits under config/prod/** require the "prod-change" label.',
    category: 'config' },

  { id: 'r-protected-paths', title: 'Protected paths require security team',
    description: 'Edits to .semgrep/** and IAM policies require @security review.',
    category: 'config' },
];

/** Lookup by rule id, for pages that pick a subset in a specific order. */
export const SEED_ADMISSION_RULE_BY_ID: Record<string, AdmissionRuleCore> =
  Object.fromEntries(SEED_ADMISSION_RULES.map((r) => [r.id, r]));
