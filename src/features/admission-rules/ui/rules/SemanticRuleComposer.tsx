import { useMemo, useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import type { RuleSignal } from '@entities/admission';

// Semantic rule authoring (Rules §G1). The user types a rule in natural
// language; we "compile" it to a structured RuleSignal preview the user
// can inspect before adding the rule to the workspace. In production this
// is a thin wrapper over an LLM call — for the demo it's deterministic
// keyword matching that picks a plausible RuleSignal shape from the prompt.
//
// The point isn't the simulator's accuracy, it's the *interaction model*:
//   1. Author intent in plain language.
//   2. See the compiled signal (so you can check the LLM didn't mishear).
//   3. Optionally edit the signal before persisting.
//   4. "Add to workspace" creates a rule pre-filled with the compiled
//      signal — drops the user into the existing rule editor flow.

type CompileResult = {
  proposedName: string;
  proposedSeverity: 'block' | 'warn' | 'info';
  signal: RuleSignal;
  rationale: string;
  /** 0..1 — how confident the simulator is. Real impl returns LLM logprobs. */
  confidence: number;
};

function compilePrompt(prompt: string): CompileResult | null {
  const p = prompt.trim().toLowerCase();
  if (p.length < 6) return null;

  // Pattern bank — ordered: most specific first. Each branch picks both a
  // signal and a sane name/severity heuristic. Severity defaults to 'warn'.
  if (/\b(secret|api[_-]?key|password|token)\b/.test(p)) {
    return {
      proposedName: 'Hardcoded credential',
      proposedSeverity: 'block',
      signal: { kind: 'external', tool: 'semgrep', ruleId: 'secrets.hardcoded' },
      rationale: 'Detected secret-shaped intent — compiled to an external semgrep rule for hardcoded credentials.',
      confidence: 0.86,
    };
  }
  if (/\b(eval|exec|child[_-]?process)\b/.test(p)) {
    return {
      proposedName: 'Dynamic code execution',
      proposedSeverity: 'block',
      signal: { kind: 'external', tool: 'eslint', ruleId: 'no-eval' },
      rationale: 'Compiled to the ESLint no-eval rule covering eval, dynamic Function, and shell execution.',
      confidence: 0.82,
    };
  }
  if (/\b(sql|query|injection)\b/.test(p)) {
    return {
      proposedName: 'SQL string interpolation',
      proposedSeverity: 'block',
      signal: { kind: 'taint', source: 'http', sink: 'sql', requireSanitizer: true },
      rationale: 'Taint flow from http source → SQL sink. Sanitizer required to satisfy the rule.',
      confidence: 0.78,
    };
  }
  if (/\b(public[\s-]?api|barrel|re-?export)\b/.test(p)) {
    return {
      proposedName: 'Public API change without test',
      proposedSeverity: 'warn',
      signal: { kind: 'graph', pattern: 'public-api-without-test' },
      rationale: 'Mapped to the engine graph pattern that detects public-API touches lacking a test delta.',
      confidence: 0.74,
    };
  }
  if (/\b(complex|cyclomatic|nesting|loc|big|huge)\b/.test(p)) {
    const m = /(\d+)/.exec(p);
    const threshold = m ? Number(m[1]) : 25;
    return {
      proposedName: `Cyclomatic complexity > ${String(threshold)}`,
      proposedSeverity: 'warn',
      signal: { kind: 'metric', field: 'cyclomatic', op: '>', value: threshold },
      rationale: `Compiled to a metric rule on file cyclomatic complexity (threshold ${String(threshold)}).`,
      confidence: 0.81,
    };
  }
  if (/\b(blast|radius|impact|fan-?in)\b/.test(p)) {
    const m = /(\d+)/.exec(p);
    const threshold = m ? Number(m[1]) : 50;
    return {
      proposedName: `Blast radius ≥ ${String(threshold)}`,
      proposedSeverity: 'warn',
      signal: { kind: 'metric', field: 'blastRadius', op: '>=', value: threshold },
      rationale: `Compiled to a metric rule on blast radius (threshold ${String(threshold)}).`,
      confidence: 0.79,
    };
  }
  if (/\b(lint|eslint|warning|hygiene)\b/.test(p)) {
    return {
      proposedName: 'Lint hygiene floor',
      proposedSeverity: 'warn',
      signal: { kind: 'metric', field: 'eslintErrors', op: '>', value: 0 },
      rationale: 'Compiled to a metric on ESLint error count (>0).',
      confidence: 0.7,
    };
  }
  // Fallback — generic DSL signal.
  return {
    proposedName: prompt.slice(0, 48),
    proposedSeverity: 'warn',
    signal: { kind: 'dsl', expr: prompt },
    rationale: 'Could not match a specialised template. Stored as a generic DSL signal.',
    confidence: 0.4,
  };
}

export function SemanticRuleComposer({
  onCreate,
}: {
  /** Caller persists by passing the compiled signal to the existing
      rule editor. Demo just no-ops; we surface the call so the page can
      wire it later without changing this component. */
  onCreate?: (compiled: CompileResult) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const compiled = useMemo(() => compilePrompt(prompt), [prompt]);

  return (
    <section
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <header
        className="flex items-center gap-2 px-4 h-9"
        style={{
          background: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <Sparkles className="w-3 h-3" style={{ color: 'var(--fg-strong)' }} />
        <h3
          className="text-[11px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          Author with natural language
        </h3>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          describe the rule, see the compiled signal
        </span>
      </header>

      <div className="p-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span
            className="text-[10px] uppercase tracking-[0.14em] font-medium"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Prompt
          </span>
          <textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); }}
            rows={2}
            placeholder='e.g. "warn if cyclomatic complexity exceeds 30"  ·  "block hardcoded API keys"  ·  "block SQL injection from request to db"'
            className="w-full text-[12px] px-2 py-1.5 rounded outline-none resize-none"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-canvas)',
              color: 'var(--fg-strong)',
            }}
          />
        </label>

        {compiled && (
          <div
            className="rounded-md overflow-hidden"
            style={{
              border: '1px solid var(--border-default)',
            }}
          >
            <div
              className="flex items-center gap-2 px-3 h-7"
              style={{
                background: 'var(--bg-surface-muted)',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <span
                className="text-[10px] uppercase tracking-[0.14em] font-medium"
                style={{ color: 'var(--fg-subtle)' }}
              >
                Compiled signal
              </span>
              <span
                className="text-[10px] font-mono ml-auto"
                style={{ color: 'var(--fg-subtle)' }}
              >
                confidence {(compiled.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="px-3 py-2 flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {compiled.proposedName}
                </span>
                <span
                  className="text-[9px] uppercase tracking-[0.14em] font-mono"
                  style={{
                    color: compiled.proposedSeverity === 'block'
                      ? 'var(--intent-danger-fg)'
                      : compiled.proposedSeverity === 'warn'
                        ? 'var(--intent-warn-fg)'
                        : 'var(--fg-subtle)',
                  }}
                >
                  {compiled.proposedSeverity}
                </span>
              </div>
              <code
                className="text-[10px] font-mono"
                style={{ color: 'var(--fg-muted)' }}
              >
                {summariseSignal(compiled.signal)}
              </code>
              <p
                className="text-[10px] leading-snug mt-1"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {compiled.rationale}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => { setPrompt(''); }}
            disabled={!prompt}
            className="h-7 px-3 rounded-md text-[11px]"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
              opacity: prompt ? 1 : 0.4,
            }}
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => { if (compiled && onCreate) onCreate(compiled); }}
            disabled={!compiled || compiled.confidence < 0.5}
            title={
              !compiled ? 'Type a rule description to compile it'
                : compiled.confidence < 0.5 ? 'Compiler confidence too low — refine the prompt'
                  : 'Add to the workspace as a new rule'
            }
            className="h-7 px-3 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: (compiled && compiled.confidence >= 0.5) ? 1 : 0.4,
              cursor: (compiled && compiled.confidence >= 0.5) ? 'pointer' : 'not-allowed',
            }}
          >
            <Wand2 className="w-3 h-3" />
            Add to workspace
          </button>
        </div>
      </div>
    </section>
  );
}

function summariseSignal(s: RuleSignal): string {
  switch (s.kind) {
    case 'metric':   return `metric: ${s.field} ${s.op} ${String(s.value)}`;
    case 'taint':    return `taint: ${s.source} → ${s.sink}${s.requireSanitizer ? ' (sanitizer required)' : ''}`;
    case 'graph':    return `graph: ${s.pattern}${s.value != null ? ` (≥${String(s.value)})` : ''}`;
    case 'external': return `external: ${s.tool}/${s.ruleId}`;
    case 'dsl':      return `dsl: ${s.expr}`;
  }
}
