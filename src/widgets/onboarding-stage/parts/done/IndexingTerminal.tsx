import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';
import { LOG_LINES, type LogKind } from './data';

// Indexing terminal — fake but believable streaming log.
export function IndexingTerminal({ repo }: { repo: string }) {
  const [lineIndex, setLineIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lineIndex >= LOG_LINES.length) return;
    const next = LOG_LINES[lineIndex];
    const delay = next.kind === 'progress' ? 280 : next.kind === 'cmd' ? 100 : 360 + Math.random() * 240;
    const id = setTimeout(() => { setLineIndex((i) => i + 1); }, delay);
    return () => { clearTimeout(id); };
  }, [lineIndex]);

  // Auto-scroll to bottom when new lines arrive.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lineIndex]);

  return (
    <div
      className="flex flex-col rounded-md overflow-hidden aspect-square"
      style={{
        background: '#0a0d12',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 shrink-0"
        style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: '#ff5f57' }} />
        <span className="w-2 h-2 rounded-full" style={{ background: '#febc2e' }} />
        <span className="w-2 h-2 rounded-full" style={{ background: '#28c840' }} />
        <Terminal className="w-3 h-3 ml-2" style={{ color: 'rgba(255,255,255,0.6)' }} />
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
          se-field · indexing
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2.5 font-mono text-[10px] leading-tight scrollbar-hide"
      >
        {LOG_LINES.slice(0, lineIndex).map((l, i) => (
          <LogLine
            key={i}
            line={l.msg.replace('{repo}', repo).replace('{branch}', 'main')}
            kind={l.kind}
          />
        ))}
        {lineIndex < LOG_LINES.length && (
          <span
            className="inline-block w-1.5 h-3 align-text-bottom"
            style={{
              background: '#9CDCFE',
              animation: 'totpShake 0s, blink 1s steps(1, end) infinite',
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

function LogLine({ line, kind }: { line: string; kind: LogKind }) {
  const color =
    kind === 'cmd'      ? '#9CDCFE'
    : kind === 'ok'     ? '#5fa86c'
    : kind === 'done'   ? '#5fa86c'
    : kind === 'progress' ? 'rgba(255,255,255,0.55)'
    : kind === 'note'   ? 'rgba(255,255,255,0.45)'
    : 'rgba(255,255,255,0.78)';
  return (
    <div className="onb-stagger" style={{ color }}>
      {line}
    </div>
  );
}
