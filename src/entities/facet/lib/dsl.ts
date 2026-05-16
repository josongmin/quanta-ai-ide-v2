import type { FileRecord, StatusKey } from '@entities/repo';

type DslPredicate = (f: FileRecord) => boolean;

export type ParseResult =
  | { ok: true; predicate: DslPredicate; tokens: ParsedToken[] }
  | { ok: false; error: string; at?: number };

type ParsedToken =
  | { kind: 'text'; raw: string; value: string }
  | { kind: 'flag'; raw: string; flag: FlagKey; negate: boolean }
  | { kind: 'kv'; raw: string; key: string; op: Op; value: string };

type Op = '>' | '>=' | '<' | '<=' | '=' | '!=';
type FlagKey =
  | 'cyclic' | 'dead' | 'deprecated' | 'generated' | 'test'
  | 'secrets' | 'strictOptOut' | 'busFactor1' | 'publicApi' | 'hasTest'
  | 'unknown';

const FLAG_GETTERS: Record<FlagKey, (f: FileRecord) => boolean> = {
  cyclic:        (f) => f.metrics.cyclic,
  dead:          (f) => f.metrics.dead,
  deprecated:    (f) => f.isDeprecated,
  generated:     (f) => f.isGenerated,
  test:          (f) => f.isTest,
  secrets:       (f) => f.metrics.secretsLikely,
  strictOptOut:  (f) => f.metrics.strictOptOut,
  busFactor1:    (f) => f.metrics.authors === 1,
  publicApi:     (f) => f.metrics.publicApi,
  hasTest:       (f) => f.metrics.hasTestFile,
  unknown:       (f) => f.metrics.unknownReasons.length > 0,
};

// Honesty layer — exposed to DSL so users can write `confidence:exact` or
// `safety:>70`. UnknownReasons becomes a flag-style `+unknownReasons` if the
// file has any.
const NUM_FIELDS: Record<string, (f: FileRecord) => number> = {
  complexity:     (f) => f.metrics.complexity,
  cyclomatic:     (f) => f.metrics.cyclomatic,
  cognitive:      (f) => f.metrics.cognitive,
  maintainability:(f) => f.metrics.maintainability,
  loc:            (f) => f.metrics.loc,
  nesting:        (f) => f.metrics.maxNesting,
  fnCount:        (f) => f.metrics.fnCount,
  largestFn:      (f) => f.metrics.largestFnLoc,
  fanIn:          (f) => f.metrics.fanIn,
  fanOut:         (f) => f.metrics.fanOut,
  churn:          (f) => f.metrics.churn,
  days:           (f) => f.metrics.daysSinceTouched,
  authors:        (f) => f.metrics.authors,
  prs:            (f) => f.metrics.recentPRs,
  any:            (f) => f.metrics.anyCount,
  tsIgnore:       (f) => f.metrics.tsIgnoreCount,
  unsafe:         (f) => f.metrics.unsafeAssertions,
  coverage:       (f) => f.metrics.lineCoverage,
  branch:         (f) => f.metrics.branchCoverage,
  mutation:       (f) => f.metrics.mutationScore,
  eslintErr:      (f) => f.metrics.eslintErrors,
  eslintWarn:     (f) => f.metrics.eslintWarnings,
  todos:          (f) => f.metrics.todoCount,
  console:        (f) => f.metrics.consoleCount,
  sast:           (f) => f.metrics.sastFindings,
  bundle:         (f) => f.metrics.bundleKB,
  jsdoc:          (f) => f.metrics.jsdocCoverage,
  pagerank:       (f) => f.metrics.pagerank,
  safety:         (f) => f.metrics.editSafety,
  blast:          (f) => f.metrics.blastRadius,
};

const STR_FIELDS: Record<string, (f: FileRecord) => string> = {
  status:     (f) => f.status.toLowerCase(),
  layer:      (f) => f.layer,
  lang:       (f) => f.language,
  owner:      (f) => f.owner.toLowerCase(),
  name:       (f) => f.name.toLowerCase(),
  path:       (f) => f.folderPath.toLowerCase(),
  confidence: (f) => f.metrics.confidence,
  index:      (f) => f.metrics.indexState,
};

const STATUS_ALIASES: Record<string, StatusKey> = {
  stable: 'STABLE',
  modified: 'MODIFIED',
  new: 'NEW',
  vulnerable: 'SECURITY_ALERT',
  vuln: 'SECURITY_ALERT',
  alert: 'SECURITY_ALERT',
  security: 'SECURITY_ALERT',
};

const FLAG_ALIASES: Record<string, FlagKey> = {
  cyclic: 'cyclic',
  dead: 'dead',
  deprecated: 'deprecated',
  generated: 'generated',
  test: 'test',
  secrets: 'secrets',
  strict_opt_out: 'strictOptOut',
  strictoptout: 'strictOptOut',
  busfactor1: 'busFactor1',
  bus_factor_1: 'busFactor1',
  publicapi: 'publicApi',
  public_api: 'publicApi',
  hastest: 'hasTest',
  has_test: 'hasTest',
  unknown: 'unknown',
};

// Tokenize: respects double-quoted strings.
function tokenize(input: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === '"') {
      let j = i + 1;
      let buf = '';
      while (j < input.length && input[j] !== '"') {
        if (input[j] === '\\' && j + 1 < input.length) { buf += input[j + 1]; j += 2; }
        else { buf += input[j]; j++; }
      }
      out.push(`"${buf}"`);
      i = j + 1;
    } else {
      let j = i;
      while (j < input.length && input[j] !== ' ' && input[j] !== '\t' && input[j] !== '\n') j++;
      out.push(input.slice(i, j));
      i = j;
    }
  }
  return out;
}

const OPS: Op[] = ['>=', '<=', '!=', '>', '<', '='];

function parseToken(raw: string): ParsedToken | { error: string } {
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    const value = raw.slice(1, -1);
    return { kind: 'text', raw, value };
  }
  if (raw.startsWith('!')) {
    const flagRaw = raw.slice(1).toLowerCase();
    const flag = FLAG_ALIASES[flagRaw];
    if (!flag) return { error: `Unknown flag: !${flagRaw}` };
    return { kind: 'flag', raw, flag, negate: true };
  }
  if (raw.startsWith('+')) {
    const flagRaw = raw.slice(1).toLowerCase();
    const flag = FLAG_ALIASES[flagRaw];
    if (!flag) return { error: `Unknown flag: +${flagRaw}` };
    return { kind: 'flag', raw, flag, negate: false };
  }
  // key:op?value
  const colonIdx = raw.indexOf(':');
  if (colonIdx < 0) {
    // bare token = name substring
    return { kind: 'text', raw, value: raw };
  }
  const key = raw.slice(0, colonIdx);
  let rest = raw.slice(colonIdx + 1);
  let op: Op = '=';
  for (const cand of OPS) {
    if (rest.startsWith(cand)) { op = cand; rest = rest.slice(cand.length); break; }
  }
  if (rest.length === 0) return { error: `Empty value for ${key}:` };
  return { kind: 'kv', raw, key, op, value: rest };
}

function compileToken(t: ParsedToken): DslPredicate | { error: string } {
  if (t.kind === 'text') {
    const needle = t.value.toLowerCase();
    return (f) =>
      f.name.toLowerCase().includes(needle) ||
      f.folderPath.toLowerCase().includes(needle);
  }
  if (t.kind === 'flag') {
    const get = FLAG_GETTERS[t.flag];
    return (f) => (t.negate ? !get(f) : get(f));
  }
  // kv
  const numGet = NUM_FIELDS[t.key];
  const strGet = STR_FIELDS[t.key];
  if (numGet) {
    const n = Number(t.value);
    if (Number.isNaN(n)) return { error: `Number expected for ${t.key}: '${t.value}'` };
    switch (t.op) {
      case '>':  return (f) => numGet(f) >  n;
      case '>=': return (f) => numGet(f) >= n;
      case '<':  return (f) => numGet(f) <  n;
      case '<=': return (f) => numGet(f) <= n;
      case '!=': return (f) => numGet(f) !== n;
      case '=':  return (f) => numGet(f) === n;
    }
  }
  if (strGet) {
    const v = t.value.toLowerCase();
    if (t.key === 'status') {
      const sk = STATUS_ALIASES[v];
      if (!sk) return { error: `Unknown status: ${t.value}` };
      return (f) => f.status === sk;
    }
    switch (t.op) {
      case '=':  return (f) => strGet(f) === v;
      case '!=': return (f) => strGet(f) !== v;
      default:
        // for strings other ops mean substring
        return (f) => strGet(f).includes(v);
    }
  }
  return { error: `Unknown field: ${t.key}` };
}

export function parseDsl(input: string): ParseResult {
  const tokens: ParsedToken[] = [];
  const preds: DslPredicate[] = [];
  for (const raw of tokenize(input.trim())) {
    if (raw.length === 0) continue;
    const tok = parseToken(raw);
    if ('error' in tok) return { ok: false, error: tok.error };
    tokens.push(tok);
    const compiled = compileToken(tok);
    if (typeof compiled !== 'function') return { ok: false, error: compiled.error };
    preds.push(compiled);
  }
  if (preds.length === 0) {
    return { ok: true, predicate: () => true, tokens: [] };
  }
  return {
    ok: true,
    tokens,
    predicate: (f) => {
      for (const p of preds) if (!p(f)) return false;
      return true;
    },
  };
}

// Field hints for autocomplete-ish UI
export const DSL_FIELDS = {
  num: Object.keys(NUM_FIELDS),
  str: Object.keys(STR_FIELDS),
  flag: Object.keys(FLAG_ALIASES),
  status: Object.keys(STATUS_ALIASES),
};
