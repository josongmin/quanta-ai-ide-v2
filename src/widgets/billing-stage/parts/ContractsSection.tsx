import { Download, FileText, ArrowUpRight } from 'lucide-react';
import { CONTRACTS, type Contract } from './data';
import { formatDate } from '@shared/i18n';

// Enterprise contracts on file. Same body-only pattern as TaxSection — host
// renders the Section header.
export function ContractsSection() {
  const isEnterprise = CONTRACTS.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <StatusPill enterprise={isEnterprise} count={CONTRACTS.length} />

      <div className="flex flex-col">
        {CONTRACTS.map((c, i) => (
          <ContractRow key={c.id} contract={c} top={i === 0} />
        ))}
      </div>

      <SalesCta />
    </div>
  );
}

function StatusPill({ enterprise, count }: { enterprise: boolean; count: number }) {
  const label = enterprise
    ? `Enterprise · ${count} active contract${count === 1 ? '' : 's'}`
    : 'Self-serve · Standard ToS apply';

  return (
    <div
      className="self-start inline-flex items-center gap-2 h-7 px-2.5 rounded-md text-sm"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-default)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: enterprise ? 'var(--intent-success-fg)' : 'var(--fg-subtle)' }}
        aria-hidden
      />
      <span style={{ color: 'var(--fg-strong)' }} className="font-medium">
        {label}
      </span>
    </div>
  );
}

function ContractRow({ contract, top }: { contract: Contract; top: boolean }) {
  const eff = formatDate(new Date(contract.effective), {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const exp = contract.expires
    ? formatDate(new Date(contract.expires), {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : 'Ongoing';

  return (
    <a
      href={contract.pdfUrl}
      className="group flex items-center gap-4 h-11 px-2 -mx-2 rounded-md transition-colors"
      style={{
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <AbbrGlyph abbr={contract.abbr} />
      <span
        className="text-base font-medium flex-1 truncate"
        style={{ color: 'var(--fg-strong)' }}
      >
        {contract.name}
      </span>
      <span
        className="font-mono text-xs tabular-nums w-[44px] shrink-0 text-right"
        style={{ color: 'var(--fg-muted)' }}
      >
        {contract.version}
      </span>
      <span
        className="text-sm tabular-nums w-[110px] shrink-0"
        style={{ color: 'var(--fg-muted)' }}
      >
        {eff}
      </span>
      <span
        className="text-sm tabular-nums w-[90px] shrink-0"
        style={{ color: contract.expires ? 'var(--fg-muted)' : 'var(--fg-subtle)' }}
      >
        {exp}
      </span>
      <span
        className="text-xs tabular-nums w-[56px] shrink-0 text-right"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {contract.sizeKb} KB
      </span>
      <span
        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-sm"
        style={{ color: 'var(--fg-muted)' }}
      >
        <Download className="w-3 h-3" />
        PDF
      </span>
    </a>
  );
}

function AbbrGlyph({ abbr }: { abbr: string }) {
  return (
    <span
      className="w-9 h-5 rounded text-2xs font-mono font-bold flex items-center justify-center shrink-0"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {abbr}
    </span>
  );
}

// Outlined CTA card. Per project convention we avoid bg-surface-muted for
// stat / CTA bands — outlined card on canvas reads as a deliberate surface
// without the muddy grey wash.
function SalesCta() {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-md"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span
        className="w-8 h-8 rounded inline-flex items-center justify-center shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
          color: 'var(--fg-accent)',
        }}
        aria-hidden
      >
        <FileText className="w-4 h-4" />
      </span>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div
          className="text-base font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          Need an enterprise contract?
        </div>
        <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Custom MSA, DPA, BAA, redlines, security review, and procurement support.
        </div>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-sm font-medium transition-colors shrink-0"
        style={{
          background: 'var(--fg-accent)',
          color: 'white',
          border: '1px solid transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.92)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
      >
        Contact sales
        <ArrowUpRight className="w-3 h-3" />
      </button>
    </div>
  );
}
