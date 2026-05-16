import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EvidenceLevel } from '@entities/admission';
import type { CodeSnippet } from './snippet';

// Code-lens evidence card. Renders a small monospace snippet with the
// tripped line highlighted, gutter line numbers, language tag, and an
// IDE deeplink. Replaces the previous one-line "path · evidence" rows on
// the Gate page so the author can judge the finding without opening their
// editor first.
//
// In production the snippet would come straight from the analyzer's SARIF
// span; here it's synthesised by gate/snippet.ts (deterministic, demo-only).

const EVIDENCE_PILL: Record<EvidenceLevel, { fg: string }> = {
  exact:      { fg: 'var(--fg-subtle)' },
  overapprox: { fg: 'var(--intent-warn-fg)' },
  unknown:    { fg: 'var(--intent-warn-fg)' },
};

export function CodeLensCard({
  filePath, snippet, evidenceText, confidence, onOpenInIDE,
}: {
  filePath: string;
  snippet: CodeSnippet;
  evidenceText: string;
  confidence: EvidenceLevel;
  /** Optional — passes filePath + line so the parent can open the host IDE. */
  onOpenInIDE?: (path: string, line: number) => void;
}) {
  const { t } = useTranslation('admission');
  const [copied, setCopied] = useState(false);
  const evidence = EVIDENCE_PILL[confidence];
  const gutterWidth = String(snippet.startLine + snippet.lines.length).length;

  const onCopy = () => {
    void navigator.clipboard
      .writeText(snippet.lines.join('\n'))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => { setCopied(false); }, 1200);
      })
      .catch(() => undefined);
  };

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Header — file path + line + evidence + actions */}
      <div
        className="flex items-center gap-2 px-3 h-8"
        style={{
          background: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <code
          className="text-[11px] font-mono truncate min-w-0 flex-1"
          style={{ color: 'var(--fg-strong)' }}
        >
          {filePath}
          <span style={{ color: 'var(--fg-subtle)' }}>:{snippet.highlightLine}</span>
        </code>
        <span
          className="text-[9px] uppercase tracking-[0.14em] font-mono shrink-0"
          style={{ color: evidence.fg }}
          title={t(`gate.lens.${confidence}Tip`)}
        >
          {t(`gate.lens.${confidence}`)}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={t('gate.lens.copy')}
          title={t('gate.lens.copy')}
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded transition-colors hover:[color:var(--fg-strong)] hover:[background:var(--bg-hover)]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
        {onOpenInIDE && (
          <button
            type="button"
            onClick={() => { onOpenInIDE(filePath, snippet.highlightLine); }}
            aria-label={t('gate.lens.openIDE')}
            title={t('gate.lens.openIDE')}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded transition-colors hover:[color:var(--fg-strong)] hover:[background:var(--bg-hover)]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Code body */}
      <pre
        className="text-[11px] font-mono leading-[1.55] py-2 overflow-x-auto"
        style={{ color: 'var(--fg-strong)' }}
      >
        {snippet.lines.map((line, i) => {
          const lineNum = snippet.startLine + i;
          const isHighlight = lineNum === snippet.highlightLine;
          return (
            <div
              key={i}
              className="flex items-start"
              style={{
                background: isHighlight
                  ? 'color-mix(in oklab, var(--intent-warn-fg) 8%, transparent)'
                  : 'transparent',
                boxShadow: isHighlight
                  ? 'inset 2px 0 0 0 var(--intent-warn-fg)'
                  : 'none',
              }}
            >
              <span
                className="select-none shrink-0 pl-3 pr-3 text-right tabular-nums"
                style={{
                  color: 'var(--fg-subtle)',
                  opacity: isHighlight ? 1 : 0.55,
                  width: `calc(${gutterWidth}ch + 24px)`,
                }}
                aria-hidden
              >
                {lineNum}
              </span>
              <code className="flex-1 min-w-0 whitespace-pre pr-3">
                {isHighlight && snippet.highlightSpan
                  ? renderWithSpan(line, snippet.highlightSpan)
                  : line || ' '}
              </code>
            </div>
          );
        })}
      </pre>

      {/* Footer — analyzer evidence text. Italic, fg-muted; the snippet
          above is the *what*, this is the *why-the-engine-thought-so*. */}
      <div
        className="px-3 py-2 text-[11px] leading-snug"
        style={{
          background: 'var(--bg-surface-muted)',
          borderTop: '1px solid var(--border-default)',
          color: 'var(--fg-muted)',
          fontStyle: 'italic',
        }}
      >
        {evidenceText}
      </div>
    </div>
  );
}

function renderWithSpan(
  line: string,
  span: { start: number; end: number },
): React.ReactNode {
  const before = line.slice(0, span.start);
  const inside = line.slice(span.start, span.end) || ' ';
  const after  = line.slice(span.end);
  return (
    <>
      {before}
      <span
        style={{
          background: 'color-mix(in oklab, var(--intent-warn-fg) 22%, transparent)',
          color: 'var(--fg-strong)',
          borderRadius: 2,
          padding: '0 2px',
          margin: '0 -2px',
          boxShadow: 'inset 0 -1px 0 0 var(--intent-warn-fg)',
        }}
      >
        {inside}
      </span>
      {after}
    </>
  );
}
