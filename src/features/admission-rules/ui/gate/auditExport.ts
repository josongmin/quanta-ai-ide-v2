// Bypass audit log export (Gate §H3 / SOC2-ish). The override ledger is
// the immutable record that gate decisions WERE acked; audit needs it
// extractable. We support two formats:
//
//   • JSON — verbatim store entries, easy to ingest in a SIEM.
//   • CSV  — for spreadsheets / quick eyeballing.
//
// Both formats include `kind` so suppressions and overrides are
// distinguishable downstream. Triggering download uses an in-memory
// Blob + anchor — no server round-trip required.

import type { OverrideEntry, SuppressionEntry } from '../../model/store';

export type AuditRow =
  | (OverrideEntry  & { kind: 'override' })
  | (SuppressionEntry & { kind: 'suppression'; fileId: number; filePath: string });

export function buildAuditRows(args: {
  overrides: OverrideEntry[];
  suppressions: SuppressionEntry[];
  prSeed?: number;
}): AuditRow[] {
  const o = args.overrides
    .filter((e) => args.prSeed == null || e.prSeed === args.prSeed)
    .map((e): AuditRow => ({ ...e, kind: 'override' }));
  const s = args.suppressions
    .filter((e) => args.prSeed == null || e.prSeed === args.prSeed)
    .map((e): AuditRow => ({ ...e, kind: 'suppression' }));
  return [...o, ...s].sort((a, b) => b.at - a.at);
}

export function exportAuditJson(rows: AuditRow[]): string {
  return JSON.stringify({ exportedAt: Date.now(), version: 1, rows }, null, 2);
}

export function exportAuditCsv(rows: AuditRow[]): string {
  const header = [
    'kind', 'id', 'at', 'expiresAt', 'prSeed', 'ruleId', 'ruleName',
    'severity', 'actor', 'reason', 'filePath',
  ].join(',');
  const lines = rows.map((r) => [
    r.kind,
    r.id,
    iso(r.at),
    iso(r.expiresAt),
    r.prSeed,
    r.ruleId,
    quote(r.ruleName),
    r.severity,
    r.actor,
    quote(r.reason),
    quote(r.kind === 'suppression' ? r.filePath : ''),
  ].join(','));
  return [header, ...lines].join('\n');
}

export function downloadAudit(format: 'json' | 'csv', rows: AuditRow[]): void {
  const blob = new Blob(
    [format === 'json' ? exportAuditJson(rows) : exportAuditCsv(rows)],
    { type: format === 'json' ? 'application/json' : 'text/csv' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admission-audit-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function quote(s: string): string {
  if (!s) return '';
  // Minimal CSV-safe quoting — wrap if it contains comma/quote/newline.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function iso(ms: number | undefined): string {
  if (ms == null) return '';
  return new Date(ms).toISOString();
}
