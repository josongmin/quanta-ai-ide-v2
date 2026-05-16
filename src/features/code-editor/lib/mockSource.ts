import type { FileRecord } from '@entities/repo';

// Synthesises plausible source for a FileRecord so the editor has something
// to render. The repo dataset is metadata-only; we never store real source.
//
// Output is deterministic per file id so opening the same file twice doesn't
// shuffle the lines under the user (avoids "did I edit this?" confusion).

const TS_HEADER = (path: string, owner: string) => [
  `// ${path}`,
  `// owner: ${owner}`,
  '// auto-generated demo source — not a real implementation',
  '',
];

const TS_BODY = (name: string, fnCount: number, loc: number) => {
  const fns: string[] = [];
  const target = Math.min(fnCount, 8);
  for (let i = 0; i < target; i++) {
    const fnName = i === 0 ? toCamel(name) : `${toCamel(name)}${suffix(i)}`;
    fns.push(
      `export function ${fnName}(input: string): string {`,
      `  // TODO: implement ${fnName}`,
      `  if (!input) return '';`,
      `  const result = input.trim();`,
      `  return result;`,
      `}`,
      '',
    );
  }
  if (loc > 60) {
    fns.push(
      `interface ${pascal(name)}Options {`,
      `  enabled: boolean;`,
      `  retries: number;`,
      `  timeoutMs?: number;`,
      `}`,
      '',
      `export const default${pascal(name)}Options: ${pascal(name)}Options = {`,
      `  enabled: true,`,
      `  retries: 3,`,
      `  timeoutMs: 5_000,`,
      `};`,
      '',
    );
  }
  return fns;
};

const TSX_BODY = (name: string) => [
  `import { useEffect, useState } from 'react';`,
  '',
  `export function ${pascal(stripExt(name))}() {`,
  `  const [count, setCount] = useState(0);`,
  '',
  `  useEffect(() => {`,
  `    const id = setInterval(() => { setCount((c) => c + 1); }, 1000);`,
  `    return () => { clearInterval(id); };`,
  `  }, []);`,
  '',
  `  return (`,
  `    <div className="p-4">`,
  `      <h2>${pascal(stripExt(name))}</h2>`,
  `      <p>tick: {count}</p>`,
  `    </div>`,
  `  );`,
  `}`,
  '',
];

const CSS_BODY = (name: string) => [
  `/* ${name} */`,
  '',
  `.${kebab(stripExt(name))} {`,
  `  display: flex;`,
  `  align-items: center;`,
  `  gap: 0.5rem;`,
  `  padding: 0.75rem 1rem;`,
  `  border-radius: 0.5rem;`,
  `  background: var(--bg-surface);`,
  `}`,
  '',
  `.${kebab(stripExt(name))}__label {`,
  `  font-weight: 600;`,
  `  color: var(--fg-default);`,
  `}`,
  '',
];

const MD_BODY = (name: string) => [
  `# ${stripExt(name)}`,
  '',
  '> Auto-generated demo content.',
  '',
  '## Overview',
  '',
  'This module is part of the demo dataset. The body is synthesised from',
  'metadata so the editor has something to render — there is no real',
  'implementation behind this file.',
  '',
  '## Notes',
  '',
  '- All metrics shown in the inspector are mocked.',
  '- Diagnostics, hover, and completion are demo-only.',
  '',
];

const JS_BODY = (name: string) => [
  `'use strict';`,
  '',
  `function ${toCamel(name)}(input) {`,
  `  if (input == null) return null;`,
  `  return String(input).trim();`,
  `}`,
  '',
  `module.exports = { ${toCamel(name)} };`,
  '',
];

export function buildMockSource(file: FileRecord): string {
  const path = `${file.folderPath.split('.').join('/')}/${file.name}`;
  const lang = file.language;
  const lines: string[] = [];
  if (lang === 'ts') {
    lines.push(...TS_HEADER(path, file.owner));
    lines.push(...TS_BODY(stripExt(file.name), file.metrics.fnCount, file.metrics.loc));
  } else if (lang === 'tsx') {
    lines.push(...TS_HEADER(path, file.owner));
    lines.push(...TSX_BODY(file.name));
  } else if (lang === 'css') {
    lines.push(...CSS_BODY(file.name));
  } else if (lang === 'md') {
    lines.push(...MD_BODY(file.name));
  } else {
    lines.push(...JS_BODY(stripExt(file.name)));
  }
  // Pad to look closer to the reported LOC (capped so the editor stays snappy).
  const targetLoc = Math.min(Math.max(file.metrics.loc, 20), 400);
  while (lines.length < targetLoc) {
    lines.push(`// ─ line ${lines.length + 1}`);
  }
  return lines.join('\n');
}

function stripExt(n: string): string {
  const i = n.lastIndexOf('.');
  return i > 0 ? n.slice(0, i) : n;
}

function toCamel(s: string): string {
  const base = stripExt(s).replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
  return base.charAt(0).toLowerCase() + base.slice(1);
}

function pascal(s: string): string {
  const c = toCamel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function kebab(s: string): string {
  return stripExt(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function suffix(i: number): string {
  const tags = ['Inner', 'Async', 'Sync', 'Fast', 'Safe', 'Strict', 'Lazy'];
  return tags[i % tags.length] ?? `_${String(i)}`;
}
