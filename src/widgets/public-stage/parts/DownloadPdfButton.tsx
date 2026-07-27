import { Download } from 'lucide-react';

// The legal pages advertise a "Download PDF" affordance, but this build has no
// document-generation backend. Rather than render a button that looks clickable
// and does nothing, it is honestly DISABLED with an accessible reason.
const REASON = 'PDF export is not available in this build.';

export function DownloadPdfButton() {
  return (
    <button
      type="button"
      disabled
      aria-disabled
      title={REASON}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-base font-medium cursor-not-allowed"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-subtle)',
        opacity: 0.6,
      }}
    >
      <Download size={13} />
      Download PDF
    </button>
  );
}
