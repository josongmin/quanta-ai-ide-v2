import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice } from './data';
import { formatDate } from '@shared/i18n';

type Props = { invoices: Invoice[] };

const fmtUsd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export function InvoicesList({ invoices }: Props) {
  return (
    <div className="flex flex-col">
      {invoices.map((inv, i) => (
        <InvoiceRow key={inv.id} invoice={inv} top={i === 0} />
      ))}
    </div>
  );
}

function InvoiceRow({ invoice, top }: { invoice: Invoice; top: boolean }) {
  const { t } = useTranslation('billing');
  const date = formatDate(new Date(invoice.date), {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  return (
    <a
      href={invoice.pdfUrl}
      className="group flex items-center gap-4 h-11 px-2 -mx-2 rounded-md transition-colors"
      style={{
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span
        className="font-mono text-sm tabular-nums w-[140px] shrink-0"
        style={{ color: 'var(--fg-default)' }}
      >
        {invoice.number}
      </span>
      <span
        className="text-sm tabular-nums w-[110px] shrink-0"
        style={{ color: 'var(--fg-muted)' }}
      >
        {date}
      </span>
      <span
        className="text-base font-medium tabular-nums w-[90px] shrink-0"
        style={{ color: 'var(--fg-strong)' }}
      >
        {fmtUsd(invoice.amount)}
      </span>
      <StatusInline status={invoice.status} />
      <span className="flex-1" />
      <span
        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-sm"
        style={{ color: 'var(--fg-muted)' }}
      >
        <Download className="w-3 h-3" />
        {t('invoices.download')}
      </span>
    </a>
  );
}

function StatusInline({ status }: { status: Invoice['status'] }) {
  // Inline text + dot — no chip background. Keeps the row visually flat.
  const { t } = useTranslation('billing');
  const fg = STATUS_FG[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: fg }}>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: fg }}
        aria-hidden
      />
      {t(`invoices.status.${status}`)}
    </span>
  );
}

const STATUS_FG: Record<Invoice['status'], string> = {
  paid:     'var(--intent-success-fg)',
  open:     'var(--fg-muted)',
  void:     'var(--fg-subtle)',
  past_due: 'var(--intent-danger-fg)',
};
