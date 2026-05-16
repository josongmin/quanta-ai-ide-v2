// Deterministic synthetic code snippet generator for the Gate page's
// code-lens evidence cards. The repo entity doesn't carry per-file source
// content — the demo only knows file metrics — so we fabricate a small,
// plausible snippet keyed on (ruleId, fileId, evidenceText). The output is
// stable across renders (same inputs → same lines), uses the rule's signal
// shape to pick a template, and marks the line that "tripped" the rule so
// the UI can render an inline highlight + IDE deeplink.
//
// In production this is the seam where you'd plug in the analyzer's actual
// source span (line, col, length) from the SARIF / engine result.

import type { RuleSource } from '@entities/admission';

export type CodeSnippet = {
  language: 'ts' | 'tsx' | 'js' | 'css' | 'md';
  startLine: number;        // 1-based, line number of the FIRST rendered line
  highlightLine: number;    // 1-based, the line that tripped the rule
  highlightSpan?: { start: number; end: number }; // column span on the highlighted line
  lines: string[];          // ~7 lines of context centred on highlightLine
};

// Hash → small int. djb2 over the seed string. Plenty for picking templates
// and offsets deterministically without pulling in a hash dep.
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

const TS_LIB_TEMPLATES: ((name: string, evidence: string) => string[])[] = [
  (name) => [
    `import { db } from '../db';`,
    `import { logger } from '../obs';`,
    ``,
    `export async function ${name}(req: Request) {`,
    `  const id = req.query.id as string;`,
    `  const row = await db.query(\`SELECT * FROM users WHERE id = '\${id}'\`);`,
    `  return row;`,
    `}`,
  ],
  (name) => [
    `import jwt from 'jsonwebtoken';`,
    ``,
    `const SECRET = 'sk_live_8f3a92b1c4d7e0f5a2b8c91d3e6f7a8b';`,
    ``,
    `export function ${name}(payload: object) {`,
    `  return jwt.sign(payload, SECRET, { expiresIn: '7d' });`,
    `}`,
  ],
  (name) => [
    `import { exec } from 'child_process';`,
    ``,
    `export function ${name}(userInput: string) {`,
    `  return new Promise((resolve, reject) => {`,
    `    exec(\`grep -r "\${userInput}" ./logs\`, (err, stdout) => {`,
    `      if (err) reject(err); else resolve(stdout);`,
    `    });`,
    `  });`,
    `}`,
  ],
  (name) => [
    `// public-api barrel re-export`,
    `export { internalHelper } from './internal';`,
    `export { ${name} } from './${name}';`,
    `export * from './types';`,
    ``,
    `// no test file: ${name}.test.ts not found`,
  ],
  (name, evidence) => [
    `export class ${name.charAt(0).toUpperCase()}${name.slice(1)}Controller {`,
    `  // cyclomatic complexity: ${(/cyclomatic\s*=\s*(\d+)/.exec(evidence)?.[1] ?? '34')}`,
    `  async handle(input: unknown) {`,
    `    if (!input) return null;`,
    `    if (typeof input === 'string') return this.parseString(input);`,
    `    if (Array.isArray(input)) return this.parseArray(input);`,
    `    if (typeof input === 'object') return this.parseObject(input as Record<string, unknown>);`,
    `    return this.fallback(input);`,
    `  }`,
    `}`,
  ],
  (name) => [
    `// @ts-ignore — vendor lib has wrong types`,
    `import legacy from 'legacy-thing';`,
    ``,
    `export function ${name}(payload: any) {`,
    `  // @ts-ignore`,
    `  return legacy.process(payload as any);`,
    `}`,
  ],
];

const NON_TS_TEMPLATES: Record<'css' | 'md' | 'js', (name: string) => string[]> = {
  css: (name) => [
    `.${name} {`,
    `  position: absolute;`,
    `  inset: 0;`,
    `  background: rgba(0, 0, 0, 0.5) !important;`,
    `  z-index: 99999;`,
    `}`,
  ],
  md: (name) => [
    `# ${name}`,
    ``,
    `Internal documentation. Do not link from public-api/.`,
    ``,
    `\`\`\`ts`,
    `import { ${name} } from '@internal/${name}';`,
    `\`\`\``,
  ],
  js: (name) => [
    `module.exports.${name} = function (input) {`,
    `  eval(input);  // dynamic dispatch`,
    `  return null;`,
    `};`,
  ],
};

// Pick the template index based on the rule's source + the evidenceText so
// matching evidences (e.g. all "secret-likely" hits) consistently land on
// the secret-shaped template.
function pickTemplate(source: RuleSource, evidence: string, fallbackSeed: number): number {
  const ev = evidence.toLowerCase();
  if (ev.includes('secret') || ev.includes('hardcoded')) return 1;
  if (ev.includes('exec') || ev.includes('command') || ev.includes('shell')) return 2;
  if (ev.includes('sql') || ev.includes('query') || ev.includes('injection')) return 0;
  if (ev.includes('public-api') || ev.includes('public api')) return 3;
  if (ev.includes('cyclomatic') || ev.includes('complexity') || ev.includes('blast')) return 4;
  if (ev.includes('any') || ev.includes('ts-ignore') || ev.includes('confidence')) return 5;
  // Fallback: spread by source so eslint vs codeql vs semgrep don't collide.
  const sourceBias: Record<RuleSource, number> = {
    native: 4, eslint: 5, semgrep: 0, codeql: 2, custom: 3,
  };
  return (sourceBias[source] + fallbackSeed) % TS_LIB_TEMPLATES.length;
}

export function generateSnippet(args: {
  ruleId: string;
  ruleSource: RuleSource;
  fileId: number;
  fileName: string;
  fileLanguage: 'ts' | 'tsx' | 'js' | 'css' | 'md';
  evidenceText: string;
}): CodeSnippet {
  const seed = hash(`${args.ruleId}:${args.fileId}:${args.evidenceText}`);
  const startLine = (seed % 80) + 12; // somewhere realistic, not line 1

  // Non-TS files get their language-specific template. We don't try to
  // "guess" a TS shape for CSS/MD because the visual contrast is part of
  // the design — the user instantly sees "ah, a stylesheet violation".
  if (args.fileLanguage === 'css' || args.fileLanguage === 'md' || args.fileLanguage === 'js') {
    const lines = NON_TS_TEMPLATES[args.fileLanguage](args.fileName);
    // For non-TS, pick the line with the most "violation-y" token.
    const guess = lines.findIndex((l) => /important|eval|@internal/.test(l));
    const highlightLine = startLine + (guess >= 0 ? guess : Math.floor(lines.length / 2));
    return {
      language: args.fileLanguage,
      startLine,
      highlightLine,
      lines,
    };
  }

  // TypeScript / TSX path.
  const templateIdx = pickTemplate(args.ruleSource, args.evidenceText, seed);
  const lines = TS_LIB_TEMPLATES[templateIdx](args.fileName, args.evidenceText);

  // Highlight rule per template — picked by hand so the highlight aligns
  // with the *tripped* line (not the import or the closing brace).
  const highlightOffset: Record<number, number> = {
    0: 5, // SQL string interpolation line
    1: 2, // hardcoded SECRET
    2: 4, // exec() with template literal
    3: 5, // missing test file comment line
    4: 1, // cyclomatic comment line
    5: 3, // any cast line
  };
  const offset = highlightOffset[templateIdx] ?? Math.floor(lines.length / 2);
  const highlightLine = startLine + offset;

  // Compute a column span for the highlight — the substring most likely
  // tripping the rule. Cheap heuristic, deterministic per template.
  const targetLine = lines[offset] ?? '';
  const span = computeSpan(targetLine, args.evidenceText, templateIdx);

  return {
    language: args.fileLanguage,
    startLine,
    highlightLine,
    highlightSpan: span,
    lines,
  };
}

function computeSpan(line: string, evidence: string, templateIdx: number):
  { start: number; end: number } | undefined {
  // Match a few well-known fragments by template; if none match, no span
  // (the row gets a soft full-line highlight instead).
  const probes: Record<number, RegExp> = {
    0: /\$\{id\}/,
    1: /'sk_live_[^']+'/,
    2: /\$\{userInput\}/,
    3: /no test file/i,
    4: /cyclomatic complexity:.*/,
    5: /payload as any|payload: any/,
  };
  const re = probes[templateIdx];
  if (!re) return undefined;
  const m = re.exec(line);
  if (!m) return undefined;
  void evidence; // reserved for future heuristics
  return { start: m.index, end: m.index + m[0].length };
}
