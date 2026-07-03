import { Fragment, type CSSProperties, type ReactNode } from 'react';

// Grid "table" used 12+ times across settings/admin pages. Not a real <table>:
// each row is a CSS-grid track sharing one `gridTemplateColumns`, with an
// uppercase header strip and per-row hover. Reproduces the existing markup
// exactly:
//   • wrapper:  rounded-md overflow-hidden, 1px --border-muted
//   • header:   h-9 px-3 gap-12, --bg-surface-muted, --fg-subtle uppercase,
//               tracking-eyebrow, 10px semibold, borderBottom --border-muted
//   • row:      h-12 px-3 gap-12, hover → --bg-hover, borderTop --border-muted
//               (omitted on the first row so it doesn't double the header line)
//
// Generic via render props: the caller supplies the column template + header
// labels and a `renderRow` that returns the cells for one item. No data logic.

export type Column = {
  /** Header label. Use `''` (or a spacer) for an actions column. */
  header: ReactNode;
  /** Align the header text. Body alignment is owned by the rendered cells. */
  align?: 'left' | 'right';
};

type Props<T> = {
  /** CSS grid-template-columns string, e.g. "180px 1fr 80px 70px". */
  columns: string;
  /** Header cell definitions. Length should match `columns` tracks. */
  headers: Column[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** Returns the cells (in column order) for one row. */
  renderRow: (row: T, index: number) => ReactNode;
  /** Shown in place of the body when `rows` is empty. */
  empty?: ReactNode;
  /** Column gap in px. Defaults to 12. */
  gap?: number;
  /** Body row height in px. Defaults to 48 (h-12). */
  rowHeight?: number;
  /** Keep a top border on the first row too. Defaults to false (row 0 is borderless under the header). */
  firstRowBorder?: boolean;
  /** Extra per-row inline style (e.g. dimming deactivated rows). */
  rowStyle?: (row: T, index: number) => CSSProperties | undefined;
};

export function DataTable<T>({
  columns, headers, rows, rowKey, renderRow, empty, gap = 12,
  rowHeight = 48, firstRowBorder = false, rowStyle,
}: Props<T>) {
  return (
    <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
      <div
        className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
        style={{
          gridTemplateColumns: columns,
          gap,
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        {headers.map((h, i) => (
          <span key={i} className={h.align === 'right' ? 'text-right' : undefined}>
            {h.header}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        empty
      ) : (
        rows.map((row, i) => (
          <div
            key={rowKey(row, i)}
            role="row"
            className="grid items-center px-3 text-base transition-colors"
            style={{
              height: rowHeight,
              gridTemplateColumns: columns,
              gap,
              borderTop: i === 0 && !firstRowBorder ? 'none' : '1px solid var(--border-muted)',
              ...rowStyle?.(row, i),
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Fragment>{renderRow(row, i)}</Fragment>
          </div>
        ))
      )}
    </div>
  );
}
