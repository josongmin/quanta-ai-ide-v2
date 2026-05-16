import type { Diagnostic } from '@codemirror/lint';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import type { FileRecord } from '@entities/repo';

// Mock language-server-like signals derived from the FileRecord metrics.
// Real LSP wiring would replace these implementations; the call shape is
// intentionally close to what an `ls.diagnostics()` / `ls.hover()` / etc.
// adapter would expose.

export function mockDiagnostics(view: EditorView, file: FileRecord): Diagnostic[] {
  const out: Diagnostic[] = [];
  const doc = view.state.doc;
  const lineCount = doc.lines;

  const seedLines = (count: number, start: number): number[] => {
    const lines: number[] = [];
    let cursor = start;
    for (let i = 0; i < count && lines.length < count; i++) {
      cursor = (cursor * 9301 + 49297) % 233_280;
      const ln = 1 + (Math.abs(cursor) % Math.max(1, lineCount));
      if (!lines.includes(ln)) lines.push(ln);
    }
    return lines;
  };

  const eslintErrors = Math.min(file.metrics.eslintErrors, 6);
  for (const ln of seedLines(eslintErrors, file.id + 13)) {
    const line = doc.line(ln);
    out.push({
      from: line.from,
      to: line.to,
      severity: 'error',
      source: 'eslint',
      message: pickFrom(file.id + ln, [
        '`any` is not allowed (no-explicit-any)',
        'Unexpected console statement (no-console)',
        'Missing return type on function (explicit-function-return-type)',
        'Promise not awaited (no-floating-promises)',
        '`require()` style import is forbidden',
      ]),
    });
  }

  const eslintWarn = Math.min(file.metrics.eslintWarnings, 8);
  for (const ln of seedLines(eslintWarn, file.id + 41)) {
    const line = doc.line(ln);
    out.push({
      from: line.from,
      to: line.to,
      severity: 'warning',
      source: 'eslint',
      message: pickFrom(file.id + ln + 1, [
        'Variable is assigned but never used (no-unused-vars)',
        'Prefer const over let where possible (prefer-const)',
        'Avoid magic numbers (no-magic-numbers)',
        'Function complexity is high (complexity)',
      ]),
    });
  }

  const todos = Math.min(file.metrics.todoCount, 4);
  for (const ln of seedLines(todos, file.id + 71)) {
    const line = doc.line(ln);
    out.push({
      from: line.from,
      to: line.to,
      severity: 'info',
      source: 'todo',
      message: 'TODO marker — track in your issue system before merging',
    });
  }

  if (file.metrics.tsIgnoreCount > 0) {
    const ln = 1 + (file.id % Math.max(1, lineCount));
    const line = doc.line(ln);
    out.push({
      from: line.from,
      to: line.to,
      severity: 'warning',
      source: 'tsc',
      message: `${String(file.metrics.tsIgnoreCount)} @ts-ignore directive(s) detected — prefer narrowed types`,
    });
  }

  return out.sort((a, b) => a.from - b.from);
}

export function mockHover(file: FileRecord, word: string): string | null {
  if (!word) return null;
  // Surface a short symbol summary keyed off the word the cursor is on.
  // Real LSP would inspect the symbol table; we synthesise something useful.
  if (word.length < 3) return null;
  const kind = /^[A-Z]/.test(word) ? 'type' : 'function';
  const safety = file.metrics.editSafety;
  const safetyTone = safety >= 70 ? 'safe to edit' : safety >= 40 ? 'caution' : 'high blast radius';
  return [
    `**${word}** — ${kind}`,
    '',
    `Defined in \`${file.name}\``,
    `Owner: ${file.owner}`,
    `Edit safety: ${String(safety)} / 100 (${safetyTone})`,
    `Fan-in: ${String(file.metrics.fanIn)} · Fan-out: ${String(file.metrics.fanOut)}`,
  ].join('\n');
}

export function mockCompletions(file: FileRecord) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const word = ctx.matchBefore(/[\w$]*/);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;

    const isTs = file.language === 'ts' || file.language === 'tsx';
    const baseKw = isTs
      ? ['const', 'let', 'function', 'export', 'import', 'interface', 'type', 'return', 'async', 'await', 'class', 'extends', 'implements']
      : ['var', 'function', 'return', 'class', 'this', 'new'];

    const symbols = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'fetch', 'JSON', 'console', 'Promise', 'Array', 'Object'];

    const repoSymbols = ['FileRecord', 'FolderRecord', 'RepoData', 'StatusKey'];

    return {
      from: word.from,
      options: [
        ...baseKw.map((label) => ({ label, type: 'keyword', boost: 10 })),
        ...symbols.map((label) => ({ label, type: 'function', boost: 5 })),
        ...repoSymbols.map((label) => ({ label, type: 'class', boost: 8, info: `entity from @entities/repo` })),
      ],
      validFor: /^[\w$]*$/,
    };
  };
}

function pickFrom<T>(seed: number, arr: T[]): T {
  const i = Math.abs(seed) % arr.length;
  return arr[i];
}
