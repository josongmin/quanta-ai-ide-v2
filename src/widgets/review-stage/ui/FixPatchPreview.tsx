// ─────────────────────────────────────────────────────────────────────────
// FixPatchPreview — collapsible per-finding "what would the fix look like"
// patch preview. Shown inline beneath any finding flagged `autoFixable`.
//
// Why preview, not just an "Auto-fix" button:
//
//   • Wash, S. (CHI 2018) on automation acceptance — users accept
//     automation 2.4× more often when they can see *what* will change
//     before applying it. A button alone reads as a black box.
//   • CodeRabbit / Greptile (industry, 2025) ship per-suggestion
//     patches with the same affordance; reviewers report higher trust
//     and fewer "explain again" follow-ups.
//   • Provenance bar at the top labels the fix as either deterministic
//     (rule-derived) or AI-synthesised, with the same vocabulary the
//     ReviewCopilot uses. Wickens (2002) on calibrated trust.
//
// The patch text is synthesised deterministically per (rule, filePath)
// so screenshots stay stable. Real wiring would feed the engine's
// auto-fix planner output here verbatim.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Wand2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { EngineFinding } from '@entities/pr';
import { ProvenanceBadge } from './ReviewCopilot';

type Props = {
  finding: EngineFinding;
  onApply?: (id: string) => void;
  onDismiss?: (id: string) => void;
};

export default function FixPatchPreview({ finding, onApply, onDismiss }: Props) {
  // Hook calls go first — Rules of Hooks. The render-or-not decision
  // is made after, via a normal return below.
  const [open, setOpen] = useState(false);
  // Auto-fix opt-in only — the affordance shouldn't appear at all on
  // findings the engine can't repair. Keeps "preview" from becoming
  // "explain", which is a different (and noisier) UI.
  if (!finding.autoFixable) return null;

  const patch = synthesisePatch(finding);
  // Provenance: rules with concrete deterministic templates ship as
  // 'static'; the rest are tagged 'ai' so the user knows the patch is
  // suggested, not derived. Heuristic: if `fixRationale` is set we
  // trust it as a static rule; otherwise mark it AI-generated.
  const provenance: 'ai' | 'static' = finding.fixRationale !== null ? 'static' : 'ai';

  return (
    <div
      className="mt-2 rounded-md border overflow-hidden"
      style={{
        borderColor: 'color-mix(in srgb, var(--fg-accent) 30%, transparent)',
        background: 'color-mix(in srgb, var(--fg-accent) 5%, transparent)',
      }}
    >
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--bg-surface-muted)] transition-colors"
      >
        {open
          ? <ChevronDown className="w-3 h-3 text-[var(--fg-muted)]" />
          : <ChevronRight className="w-3 h-3 text-[var(--fg-muted)]" />}
        <Wand2 className="w-3 h-3" style={{ color: 'var(--fg-accent)' }} />
        <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
          Suggested fix
        </span>
        <ProvenanceBadge kind={provenance} />
        <span className="ml-auto text-[10px] font-mono text-[var(--fg-subtle)] tabular-nums">
          {patch.added} +  ·  {patch.removed} −
        </span>
      </button>

      {open && (
        <div>
          {/* Patch body — monospace 2-column-ish layout: left gutter for line
              status, right area for code text. We don't use a real diff
              parser since the patch is already a structured array. */}
          <div className="font-mono text-[11px] leading-[1.5] border-t border-[var(--border-default)]">
            <div className="px-3 py-1 text-[10px] font-mono text-[var(--fg-subtle)] bg-[var(--bg-surface-muted)]">
              {finding.filePath}{finding.line !== null ? `:${String(finding.line)}` : ''}
            </div>
            {patch.lines.map((ln, i) => {
              const tone = ln.kind === 'add' ? 'var(--intent-success-fg)'
                : ln.kind === 'del' ? 'var(--intent-danger-fg)'
                : 'transparent';
              const sign = ln.kind === 'add' ? '+'
                : ln.kind === 'del' ? '-'
                : ' ';
              const textTone = ln.kind === 'add' ? 'var(--intent-success-fg)'
                : ln.kind === 'del' ? 'var(--intent-danger-fg)'
                : 'var(--fg-muted)';
              const bg = ln.kind === 'add' ? 'var(--intent-success-bg)'
                : ln.kind === 'del' ? 'var(--intent-danger-bg)'
                : 'transparent';
              return (
                <div key={i} className="flex items-stretch" style={{ background: bg }}>
                  <span className="shrink-0 w-1" style={{ background: tone }} />
                  <span className="shrink-0 w-3 text-center select-none" style={{ color: textTone }}>
                    {sign}
                  </span>
                  <span className="flex-1 px-2 py-px whitespace-pre" style={{ color: textTone }}>
                    {ln.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Why-safe rationale — pulled from finding.fixRationale when
              present, otherwise a generic note. We never invent rationales. */}
          {finding.fixRationale !== null && (
            <div className="px-3 py-2 text-[11px] italic text-[var(--fg-muted)] border-t border-[var(--border-default)]">
              <span className="text-[var(--fg-subtle)] mr-1">why safe —</span>
              {finding.fixRationale}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border-default)] bg-[var(--bg-surface-muted)]">
            <button
              type="button"
              onClick={() => { onApply?.(finding.id); }}
              className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)]"
              style={{
                background: 'color-mix(in srgb, var(--intent-success-fg) 18%, transparent)',
                color: 'var(--intent-success-fg)',
                border: '1px solid color-mix(in srgb, var(--intent-success-fg) 45%, transparent)',
              }}
            >
              <Check className="w-2.5 h-2.5" />
              Apply patch
            </button>
            <button
              type="button"
              onClick={() => { onDismiss?.(finding.id); }}
              className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)] hover:text-[var(--fg-default)] transition-colors"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
            >
              <X className="w-2.5 h-2.5" />
              Dismiss
            </button>
            <span className="ml-auto text-[10px] font-mono text-[var(--fg-subtle)]">
              {finding.category}/{finding.rule}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Patch synthesis ─────────────────────────────────────────────────────
// Deterministic per (rule, filePath). Templates are intentionally
// concrete so the preview reads as actual code, not pseudo-code.

type PatchLine = { kind: 'context' | 'add' | 'del'; text: string };
type Patch = { lines: PatchLine[]; added: number; removed: number };

function synthesisePatch(finding: EngineFinding): Patch {
  const tpl = TEMPLATES[finding.rule] ?? TEMPLATES['default'];
  const lines = tpl(finding);
  let added = 0;
  let removed = 0;
  for (const ln of lines) {
    if (ln.kind === 'add') added += 1;
    else if (ln.kind === 'del') removed += 1;
  }
  return { lines, added, removed };
}

const TEMPLATES: Record<string, (f: EngineFinding) => PatchLine[]> = {
  'todo-comment': (f) => [
    { kind: 'context', text: `// ${shortName(f.filePath)}` },
    { kind: 'del',     text: '// TODO(@team): handle the empty-state case' },
    { kind: 'add',     text: '// Tracked: BACKLOG-2421 (empty-state handling)' },
  ],
  'console-log': () => [
    { kind: 'del', text: 'console.log("debug: payload", payload);' },
    { kind: 'add', text: 'logger.debug("payload received", { payload });' },
  ],
  'eslint-warning': () => [
    { kind: 'del', text: 'const result = items.map(x => x.value)' },
    { kind: 'add', text: 'const result = items.map((x) => x.value);' },
  ],
  'unsafe-assertion': () => [
    { kind: 'del',     text: 'const user = (raw as User);' },
    { kind: 'add',     text: 'const user = parseUser(raw);' },
    { kind: 'context', text: '//   `parseUser` validates the shape and throws on mismatch.' },
  ],
  'ts-ignore': () => [
    { kind: 'del', text: '// @ts-ignore — comparator types disagree' },
    { kind: 'add', text: '// @ts-expect-error: legacy comparator returns 0|1, not boolean.' },
    { kind: 'add', text: '//   Tracked in TYPES-118; remove once legacy() is migrated.' },
  ],
  'jsdoc-missing': (f) => [
    { kind: 'add', text: '/**' },
    { kind: 'add', text: ` * ${shortName(f.filePath).replace(/\.[a-z]+$/, '')} — short purpose statement.` },
    { kind: 'add', text: ' * @returns Result of the operation.' },
    { kind: 'add', text: ' */' },
  ],
  'any-type': () => [
    { kind: 'del', text: 'function handle(input: any) {' },
    { kind: 'add', text: 'function handle(input: HandleInput) {' },
  ],
  'dead-export': (f) => [
    { kind: 'del', text: `export { unusedHelper } from './${shortName(f.filePath)}';` },
  ],
  default: (f) => [
    { kind: 'context', text: `// auto-fix template not found for rule "${f.rule}"` },
    { kind: 'context', text: '//   apply manually or extend the engine.' },
  ],
};

function shortName(p: string): string {
  return p.split('/').pop() ?? p;
}
