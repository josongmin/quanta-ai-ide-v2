export type LogKind = 'cmd' | 'info' | 'progress' | 'ok' | 'done' | 'note';

// Fake but believable streaming index log for the terminal pane.
export const LOG_LINES: { msg: string; kind: LogKind }[] = [
  { msg: '$ se-field index --repo {repo} --branch {branch}',                                    kind: 'cmd' },
  { msg: '→ resolving auth via OAuth installation 47218',                                       kind: 'info' },
  { msg: '✓ cloned in 2.3s · 482 MB · 12,478 commits',                                          kind: 'ok' },
  { msg: '→ language detection: TypeScript (62%), JavaScript (28%), Markdown (10%)',           kind: 'info' },
  { msg: '→ parsing 8,412 source files (parallelism: 12)',                                     kind: 'info' },
  { msg: '   parsed 1,200 / 8,412 · 14% · 412 ms',                                              kind: 'progress' },
  { msg: '   parsed 4,800 / 8,412 · 57% · 1.6 s',                                               kind: 'progress' },
  { msg: '   parsed 8,412 / 8,412 · 100% · 2.9 s',                                              kind: 'progress' },
  { msg: '✓ 312,884 symbols · 18,442 modules · 4,218 cross-package edges',                     kind: 'ok' },
  { msg: '→ building call graph + def-use chains',                                              kind: 'info' },
  { msg: '   ↳ resolving 38,217 unresolved imports across packages',                            kind: 'info' },
  { msg: '   ↳ folding type-equivalent declarations · 12,308 → 8,182',                          kind: 'info' },
  { msg: '✓ graph built · 8,182 nodes · 41,108 edges · 1.4 s',                                  kind: 'ok' },
  { msg: '→ priming dot field projection (Healey 4-hue palette)',                               kind: 'info' },
  { msg: '✓ first signals visible · ready for inspection',                                      kind: 'done' },
  { msg: '─ ongoing: blast-radius pass, hotspot ranking · runs in background ─',                 kind: 'note' },
];

export function firstName(full: string) {
  const t = full.trim().split(/\s+/)[0];
  return t || 'there';
}

export function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
