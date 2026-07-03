import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { useAdmissionStore } from '../../../../model/store';
import { SEVERITY_COLOR, useV2 } from '../tokens';
import { V2Card, SectionTitle } from '../primitives';

// ── Import / export ──────────────────────────────────────────────────

export function ImportExportSection() {
  const t = useV2();
  const { t: tA } = useTranslation('admission');
  const exportRules = useAdmissionStore((s) => s.exportRules);
  const importRules = useAdmissionStore((s) => s.importRules);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  const exported = useMemo(() => exportRules(), [exportRules]);

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={FileText}>{tA('section.export')}</SectionTitle>
          <span className="text-xs font-mono" style={{ color: t.textSubtle }}>
            current ruleset as JSON
          </span>
          <div className="flex-1" />
          <button type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(exported);
            }}
            className="text-xs font-bold uppercase tracking-eyebrow px-2.5 py-1 rounded-md"
            style={{ background: t.badgeBg, color: t.textBody, border: `1px solid ${t.border}` }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverActive; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = t.badgeBg; }}
          >
            Copy
          </button>
        </div>
        <pre
          className="text-xs font-mono overflow-auto p-3 rounded-md leading-relaxed"
          style={{
            color: t.textBody,
            background: t.inset,
            border: `1px solid ${t.borderSoft}`,
            maxHeight: 360,
          }}
        >
          {exported}
        </pre>
      </V2Card>

      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={FileText}>{tA('section.import')}</SectionTitle>
          <span className="text-xs font-mono" style={{ color: t.textSubtle }}>
            paste JSON · merges by id
          </span>
        </div>
        <textarea
          value={importText}
          onChange={(e) => { setImportText(e.target.value); setImportResult(null); }}
          placeholder='{"version": 1, "rules": [ ... ]}'
          className="w-full text-xs font-mono p-3 rounded-md leading-relaxed outline-none"
          style={{
            color: t.textBody,
            background: t.inset,
            border: `1px solid ${t.borderSoft}`,
            minHeight: 200,
          }}
        />
        <div className="mt-3 flex items-center gap-2">
          <button type="button"
            onClick={() => {
              const r = importRules(importText);
              if (r.ok) setImportResult(`Imported ${r.count} rules.`);
              else setImportResult(`Error: ${r.error}`);
            }}
            disabled={!importText.trim()}
            className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-eyebrow disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: t.textHi, color: t.page }}
          >
            Import
          </button>
          <button type="button"
            onClick={() => { setImportText(''); setImportResult(null); }}
            className="text-xs font-mono uppercase tracking-eyebrow px-2"
            style={{ color: t.textSubtle }}
            onMouseEnter={(e) => { e.currentTarget.style.color = t.textBody; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = t.textSubtle; }}
          >
            clear
          </button>
          <div className="flex-1" />
          {importResult && (
            <span
              className="text-xs font-mono"
              style={{
                color: importResult.startsWith('Error') ? SEVERITY_COLOR.block : t.ok,
              }}
            >
              {importResult}
            </span>
          )}
        </div>
        <div className="mt-4 text-xs font-mono leading-relaxed" style={{ color: t.textSubtle }}>
          Tip — drop in your <span style={{ color: t.textMuted }}>.eslintrc</span> rules,
          a <span style={{ color: t.textMuted }}>semgrep.yml</span> excerpt, or a CodeQL
          query pack manifest. The importer normalises into the unified rule shape;
          unknown fields are preserved as <span style={{ color: t.textMuted }}>external</span> signals.
        </div>
      </V2Card>
    </div>
  );
}
