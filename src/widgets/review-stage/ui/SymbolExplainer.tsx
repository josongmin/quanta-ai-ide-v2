// ─────────────────────────────────────────────────────────────────────────
// SymbolExplainer — inline expand for symbolChanges with deterministic
// "what does this look like" + "what to verify" hints per symbol.
//
// Unlike CallGraphChangesCard (which shows *edges* between symbols),
// this card shows *individual* symbols with:
//
//   • One-line explanation derived from kind + change + path heuristics.
//   • A "verify" checklist of 2–3 items tied to the symbol's category
//     (functions get behaviour checks; types get backward-compat checks;
//     consts get usage-search prompts).
//
// Why this is the right surface (objective grounding):
//
//   • Bacchelli & Bird (2013): #3 friction is "I don't know what to
//     check here." Per-symbol checklists turn vague review into
//     concrete questions.
//   • Cohen (2006): structured per-item checks raise defect-find
//     rate by a measurable margin (~25%) over free-form review.
//   • Healey & Enns (2012) parallel decomposition: per-symbol cards
//     beat "one giant prose narrative" for skim-time on dense PRs.
//
// AI provenance: tagged `ai` even though the explanations are
// deterministic — they're synthesised from heuristics that an LLM
// would replace in production. Trust calibration (Wickens 2002).
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import {
  ChevronRight, ChevronDown, BookOpen, CircleCheck,
} from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import V2Card from './V2Card';
import { ProvenanceBadge } from './ReviewCopilot';
import { symbolChanges, type SymbolChange } from '../lib/sota';

const CHANGE_TONE: Record<SymbolChange['change'], string> = {
  modified: '#7aa7d4',
  added:    '#5fa86c',
  removed:  '#c25a55',
};
const CHANGE_LABEL: Record<SymbolChange['change'], string> = {
  modified: 'modified',
  added:    'added',
  removed:  'removed',
};

const KIND_TAG: Record<SymbolChange['kind'], string> = {
  function: 'fn',
  class:    'cls',
  type:     'ty',
  const:    'const',
  export:   'export',
};

type Props = {
  pr: PullRequest;
  onJumpToFile?: (path: string) => void;
};

export default function SymbolExplainer({ pr, onJumpToFile }: Props) {
  const symbols = useMemo<SymbolChange[]>(() => symbolChanges(pr), [pr]);
  const [openId, setOpenId] = useState<string | null>(null);

  if (symbols.length === 0) return null;

  // Cap at 8 — past that the card starts feeling list-heavy and
  // SymbolChangesCard already covers the breadth view. This card is
  // for *depth* — explain a few well, not all shallowly.
  const visible = symbols.slice(0, 8);
  const overflow = symbols.length - visible.length;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-3.5 h-3.5 text-white/55" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Symbol explainer
        </span>
        <ProvenanceBadge kind="ai" />
        <span className="text-[10px] font-mono text-white/40">
          {visible.length}{overflow > 0 ? ` / ${String(symbols.length)}` : ''} {symbols.length === 1 ? 'symbol' : 'symbols'} · what to verify
        </span>
      </div>

      <ul className="space-y-1.5">
        {visible.map((s, i) => {
          const id = `${s.filePath}::${s.name}::${String(i)}`;
          const open = openId === id;
          const tone = CHANGE_TONE[s.change];
          const explanation = explain(s);
          return (
            <li
              key={id}
              className="rounded-md overflow-hidden"
              style={{
                background: open ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.018)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <button
                type="button"
                onClick={() => { setOpenId(open ? null : id); }}
                aria-expanded={open}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
              >
                {open
                  ? <ChevronDown className="w-3 h-3 text-white/45 shrink-0" />
                  : <ChevronRight className="w-3 h-3 text-white/45 shrink-0" />}
                <span
                  className="shrink-0 inline-flex items-center px-1.5 h-4 rounded-sm text-[9px] font-mono font-bold uppercase tracking-[0.10em]"
                  style={{ background: `${tone}22`, color: tone }}
                >
                  {CHANGE_LABEL[s.change]}
                </span>
                <span className="shrink-0 text-[9px] font-mono text-white/40 uppercase">
                  {KIND_TAG[s.kind]}
                </span>
                <span className="text-[12px] font-mono text-white/85 truncate">
                  {s.name}
                </span>
                <span className="ml-auto text-[10px] font-mono text-white/35 truncate max-w-[180px]" title={s.filePath}>
                  {trimMid(s.filePath, 28)}
                </span>
              </button>
              {open && (
                <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">
                  <div className="text-[12px] leading-relaxed text-white/70 mb-3">
                    {explanation.summary}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1.5">
                    Verify
                  </div>
                  <ul className="space-y-1">
                    {explanation.checks.map((c, ci) => (
                      <li key={ci} className="flex items-start gap-2 text-[11px] leading-snug text-white/65">
                        <CircleCheck className="w-2.5 h-2.5 text-white/30 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                  {onJumpToFile && (
                    <button
                      type="button"
                      onClick={() => { onJumpToFile(s.filePath); }}
                      className="mt-3 inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 hover:text-white/85 hover:bg-white/[0.04] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
                    >
                      Jump to file
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {overflow > 0 && (
        <div className="mt-2 text-[10px] font-mono text-white/35">
          +{String(overflow)} more — Symbol Changes card lists the rest.
        </div>
      )}
    </V2Card>
  );
}

// ── Heuristic explanations ───────────────────────────────────────────────
// Deterministic — synthesised from (kind, change, path). An LLM would
// replace these in production, but the structure (one-line summary +
// 2-3 verify checks) stays the same.

type Explanation = { summary: string; checks: string[] };

function explain(s: SymbolChange): Explanation {
  const isAuth = /\bauth\b|login|session|token/i.test(s.filePath);
  const isPay = /payment|billing|invoice|charge/i.test(s.filePath);
  const isApi = /\bapi\b|router|endpoint|controller/i.test(s.filePath);

  if (s.kind === 'function') {
    if (s.change === 'added') {
      return {
        summary: `New function \`${s.name}\` introduced in ${shortName(s.filePath)}. New behaviour, no existing callers — verify the contract before reviewing call sites.`,
        checks: [
          'Are inputs validated at the function boundary, or assumed-shape from callers?',
          'Are error paths explicit (throw / Result) or silent?',
          isAuth ? 'Auth-adjacent: does this fail closed when input is missing/malformed?'
            : isPay ? 'Payments-adjacent: idempotent on retries? amount precision?'
            : 'Pure or side-effecting? Tests cover both happy + error path?',
        ],
      };
    }
    if (s.change === 'removed') {
      return {
        summary: `Function \`${s.name}\` removed from ${shortName(s.filePath)}. Verify no external callers remain.`,
        checks: [
          'Search the repo for `' + s.name + '(` — any remaining call sites?',
          'Was this exported? If yes, this is a breaking change for consumers.',
          'Linked deletion of tests — or are tests now orphaned?',
        ],
      };
    }
    return {
      summary: `Function \`${s.name}\` modified. Both sides of the diff touch its definition — read the *behaviour delta*, not the line-by-line.`,
      checks: [
        'Did the contract change (parameter list, return shape, thrown errors)?',
        isApi ? 'API-adjacent: response schema same? status codes same?' : 'Are existing callers still safe with the new behaviour?',
        'Tests updated alongside, or stale assertions?',
      ],
    };
  }

  if (s.kind === 'class') {
    return {
      summary: `Class \`${s.name}\` ${s.change}. Object-oriented changes have wider blast — every consumer assumes its public surface.`,
      checks: [
        s.change === 'added'
          ? 'Could this be a function instead? Class is justified only if state is needed.'
          : 'Did public method signatures change? Subclasses or duck-typed consumers will break silently.',
        'Is the constructor still safe to call from existing call sites?',
        'Inheritance: any subclasses elsewhere that depend on the old shape?',
      ],
    };
  }

  if (s.kind === 'type') {
    return {
      summary: `Type \`${s.name}\` ${s.change}. Type changes are *load-bearing* for everyone who consumes them — TS will catch shape mismatches but not semantic ones.`,
      checks: [
        s.change === 'modified'
          ? 'Any field renamed, narrowed, or made optional → required? Those break consumers.'
          : 'Is the type exported? If so, treat as a public surface change.',
        'Generic params: variance correct (in / out positions)?',
        'JSON wire format: does the type still serialise the same?',
      ],
    };
  }

  if (s.kind === 'const') {
    return {
      summary: `Constant \`${s.name}\` ${s.change} in ${shortName(s.filePath)}. Constants are easy to grep, but their *meaning* often hides in usage patterns.`,
      checks: [
        s.change === 'modified'
          ? 'Same value range? A timeout going from 5s → 30s changes behaviour silently.'
          : 'Is this referenced elsewhere yet? An unused const is dead code.',
        'Magic numbers: should this live behind a name with a comment instead?',
        'Re-exported from a barrel? Public surface change?',
      ],
    };
  }

  // export
  return {
    summary: `Export \`${s.name}\` ${s.change}. Public surface — any consumer outside this file is affected.`,
    checks: [
      'Is this a documented public API or an internal helper that leaked?',
      s.change === 'removed' ? 'Removing an export is breaking — bump major or restore.' : 'Naming consistent with existing exports in this barrel?',
      'TypeScript declaration files (.d.ts) re-emit the same shape?',
    ],
  };
}

function shortName(p: string): string {
  return p.split('/').pop() ?? p;
}

function trimMid(s: string, max: number): string {
  if (s.length <= max) return s;
  return `…${s.slice(-(max - 1))}`;
}
