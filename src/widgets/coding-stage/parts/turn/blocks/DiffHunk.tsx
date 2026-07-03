import { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { CodingDiffHunk } from '../../types';

// Unified hunk: classic single-column diff with +/- gutter. Each line
// hovers an inline-edit affordance at its right edge so the user can
// rewrite a *specific* line without nuking the whole diff. Real impl
// would dispatch the rewrite back to the agent; the demo just dispatches
// a window event the parent (CodingStage) listens for.
export function UnifiedHunkBody({ hunk }: { hunk: CodingDiffHunk }) {
  return (
    <div className="font-mono text-sm leading-[1.55]">
      {hunk.lines.map((line, j) => (
        <DiffLine key={j} line={line} />
      ))}
    </div>
  );
}

// Split (side-by-side): build pseudo-rows by pairing adjacent del/add
// lines. Anything unpaired (pure context, lone del or add) takes a
// single side and leaves the other blank. Real GitHub-style splitter
// uses LCS; for the demo this naive pairing is good enough.
export function SplitHunkBody({ hunk }: { hunk: CodingDiffHunk }) {
  const rows = useMemo(() => buildSplitRows(hunk.lines), [hunk.lines]);
  const divider = 'border-[color:var(--border-muted)]';
  return (
    <div className={`grid grid-cols-2 divide-x ${divider} font-mono text-sm leading-[1.55]`}>
      <div>
        {rows.map((r, i) => (
          <DiffSplitCell key={`L${i}`} side="left" line={r.left} />
        ))}
      </div>
      <div>
        {rows.map((r, i) => (
          <DiffSplitCell key={`R${i}`} side="right" line={r.right} />
        ))}
      </div>
    </div>
  );
}

type SplitRow = {
  left:  CodingDiffHunk['lines'][number] | null;  // del or ctx
  right: CodingDiffHunk['lines'][number] | null;  // add or ctx
};
function buildSplitRows(lines: CodingDiffHunk['lines']): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.kind === 'ctx') {
      rows.push({ left: line, right: line });
      i += 1;
      continue;
    }
    if (line.kind === 'del') {
      // Pair runs of consecutive dels with the following adds 1:1.
      const dels: CodingDiffHunk['lines'] = [];
      while (i < lines.length && lines[i].kind === 'del') { dels.push(lines[i]); i += 1; }
      const adds: CodingDiffHunk['lines'] = [];
      while (i < lines.length && lines[i].kind === 'add') { adds.push(lines[i]); i += 1; }
      const pairCount = Math.max(dels.length, adds.length);
      for (let p = 0; p < pairCount; p++) {
        rows.push({ left: dels[p] ?? null, right: adds[p] ?? null });
      }
      continue;
    }
    // Pure add (no preceding del to pair).
    if (line.kind === 'add') {
      rows.push({ left: null, right: line });
      i += 1;
      continue;
    }
    i += 1;
  }
  return rows;
}

function DiffSplitCell({
  side, line,
}: {
  side: 'left' | 'right';
  line: CodingDiffHunk['lines'][number] | null;
}) {
  if (line == null) {
    return <div className="px-2 py-px bg-[color:var(--bg-surface-muted)]">&nbsp;</div>;
  }
  return <DiffLine line={line} sideHint={side} />;
}

// Single diff line with hover inline-edit affordance. `sideHint` is
// only used for split-view to suppress the gutter glyph on context rows
// since the equality is already obvious from alignment.
function DiffLine({
  line, sideHint,
}: {
  line: CodingDiffHunk['lines'][number];
  sideHint?: 'left' | 'right';
}) {
  const { t } = useTranslation('coding');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  void sideHint;
  const toneStyle: React.CSSProperties | undefined =
    line.kind === 'add'
      ? { background: 'color-mix(in srgb, var(--intent-success-vivid) 8%, transparent)', color: 'var(--intent-success-fg)' }
      : line.kind === 'del'
      ? { background: 'color-mix(in srgb, var(--intent-danger-vivid) 8%, transparent)', color: 'var(--intent-danger-fg)' }
      : undefined;
  const tone = line.kind === 'add' || line.kind === 'del'
    ? ''
    : 'text-[color:var(--fg-muted)]';
  const gutterStyle: React.CSSProperties | undefined =
    line.kind === 'add' ? { color: 'var(--intent-success-vivid)' }
    : line.kind === 'del' ? { color: 'var(--intent-danger-vivid)' }
    : undefined;
  const gutterTone = line.kind === 'add' || line.kind === 'del'
    ? ''
    : 'text-[color:var(--fg-subtle)]';

  function dispatchRewrite() {
    if (!text.trim()) return;
    window.dispatchEvent(new CustomEvent('coding:line-rewrite', {
      detail: { original: line.text, instruction: text.trim() },
    }));
    setEditing(false);
    setText('');
  }

  return (
    <div style={toneStyle} className={`group/line relative px-2 py-px whitespace-pre ${tone}`}>
      <span style={gutterStyle} className={`select-none mr-2 inline-block w-3 ${gutterTone}`}>
        {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}
      </span>
      {line.text}
      {/* Hover affordance — sits flush to the right edge so it doesn't
          shift the line text. Only meaningful for non-blank lines. */}
      {line.text.length > 0 && !editing && (
        <button
          type="button"
          onClick={() => { setEditing(true); }}
          title={t('lineEdit.rewrite')}
          aria-label={t('lineEdit.rewrite')}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity p-0.5 rounded bg-[var(--bg-elevated)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)] border border-[color:var(--border-default)]"
        >
          <Wand2 className="w-2.5 h-2.5" />
        </button>
      )}
      {editing && (
        <div className="mt-1 flex items-center gap-1 px-1.5 py-1 rounded bg-[var(--bg-elevated)] border border-[color:var(--border-default)]">
          <Wand2 className="w-2.5 h-2.5 shrink-0 text-[color:var(--fg-subtle)]" />
          <input
            autoFocus
            value={text}
            onChange={(e) => { setText(e.target.value); }}
            placeholder={t('lineEdit.placeholder')}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setText(''); return; }
              if (e.key === 'Enter') { e.preventDefault(); dispatchRewrite(); }
            }}
            className="flex-1 bg-transparent outline-none text-sm text-[color:var(--fg-strong)] placeholder:text-[color:var(--fg-subtle)]"
          />
          <button
            type="button"
            onClick={() => { setEditing(false); setText(''); }}
            className="px-1.5 py-0.5 rounded text-xs text-[color:var(--fg-muted)]"
          >
            {t('lineEdit.cancel')}
          </button>
          <button
            type="button"
            onClick={dispatchRewrite}
            disabled={!text.trim()}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
              text.trim()
                ? 'bg-[color:var(--fg-strong)] text-[color:var(--bg-surface)] hover:opacity-90'
                : 'bg-[color:var(--bg-elevated)] text-[color:var(--fg-subtle)] cursor-not-allowed'
            }`}
          >
            {t('lineEdit.submit')}
          </button>
        </div>
      )}
    </div>
  );
}
