import { useCallback, useMemo, useRef, useState } from 'react';
import { Search, X, Code2, Regex, CaseSensitive, ChevronDown, History, SlidersHorizontal } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFilterStore } from '@entities/filter-state';
import { useTranslation } from '@shared/i18n';
import { GlassCard } from '@shared/ui';
import { useShortcut } from '@shared/lib';
import type { SearchMode } from '@entities/repo';

const SAMPLES: { i18nKey: string; q: string }[] = [
  { i18nKey: 'highRisk',       q: 'complexity:>30 churn:>0.5 !test' },
  { i18nKey: 'vulnerableHubs', q: 'status:vulnerable fanIn:>5' },
  { i18nKey: 'staleCode',      q: 'days:>180 churn:<0.05 !test' },
  { i18nKey: 'longFiles',      q: 'loc:>500' },
  { i18nKey: 'untested',       q: '!hasTest coverage:<40' },
  { i18nKey: 'typeUnsafe',     q: 'any:>20 +strictOptOut' },
  { i18nKey: 'busFactor1',     q: '+busFactor1 fanIn:>3' },
  { i18nKey: 'cycleMembers',   q: '+cyclic' },
];

const NUMERIC_KEYS = new Set([
  'complexity','cyclomatic','cognitive','loc','fanIn','fanOut','churn','days',
  'authors','prs','any','tsIgnore','unsafe','coverage','branch','mutation',
  'eslintErr','eslintWarn','todos','console','sast','bundle','jsdoc','pagerank',
]);
const STRING_KEYS = new Set(['status','layer','lang','owner','name','path']);

export default function SearchBar({
  maxWidth = 'calc(100vw - 820px)',
}: {
  maxWidth?: number | string;
} = {}) {
  const { t } = useTranslation('search');
  // Batch the read-only store reads into a single shallow-selected object so
  // this keystroke-hot component runs one subscription instead of five. The
  // `useShallow` wrapper keeps the snapshot stable when the selected fields
  // are unchanged, so unrelated store mutations don't re-render. `search`
  // still updates on every keystroke, which is the intended re-render.
  const { search, searchMode, matchedCount, repo, searchError } = useFilterStore(
    useShallow((s) => ({
      search: s.state.search,
      searchMode: s.state.searchMode,
      matchedCount: s.matchedCount,
      repo: s.repo,
      searchError: s.searchError,
    })),
  );
  // Action setters are reference-stable in zustand, so they can be pulled
  // once via a shallow-selected object without adding re-renders.
  const { setSearch, setSearchMode } = useFilterStore(
    useShallow((s) => ({ setSearch: s.setSearch, setSearchMode: s.setSearchMode })),
  );
  const [advOpen, setAdvOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = repo.files.length;
  const hasError = Boolean(searchError) && search.length > 0;
  const placeholder = t(`placeholder.${searchMode}`);

  // "/" focuses the input (Sourcegraph-style hotkey). Routed through the shared
  // keybinding authority so it is scope-aware and suppressed under a modal;
  // ignoreInputs so it doesn't hijack "/" while a field is focused. Focus-only
  // (no select) to preserve the former raw-listener behavior.
  useShortcut({ key: '/', ignoreInputs: true }, () => { inputRef.current?.focus(); });

  // Cmd/Ctrl+K — focus the input. `ignoreInputs: false` so the shortcut
  // still works when focus is already in another input (e.g. settings).
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  useShortcut({ key: 'k', ctrl: true, ignoreInputs: false }, focusInput);

  const tokens = useMemo(() => tokenize(search, searchMode), [search, searchMode]);
  const showOverlay = searchMode === 'dsl' && search.length > 0 && !hasError;

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[640px] min-w-[420px]"
      style={{ maxWidth }}
    >
      <GlassCard className="overflow-hidden">
        {/* Main row */}
        <div className="flex items-stretch">
          {/* Pattern type toggle (Sourcegraph signature: "" .* [ ]) */}
          <PatternToggle mode={searchMode} setMode={setSearchMode} />

          {/* Input area */}
          <div className="relative flex-1 min-w-0 flex items-center px-2">
            <Search className="w-4 h-4 shrink-0 text-[var(--fg-muted)]" />
            <div className="relative flex-1 min-w-0 ml-1">
              {showOverlay && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 flex items-center px-1 py-1.5 font-mono text-base whitespace-pre overflow-hidden"
                >
                  {tokens.map((t) => {
                    const ts = tokenStyle(t.kind);
                    return (
                      <span key={`${String(t.pos)}-${t.kind}`} style={ts.style} className={ts.className}>{t.text}</span>
                    );
                  })}
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                placeholder={placeholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                style={hasError ? { color: 'var(--intent-danger-fg)' } : undefined}
                className={`relative w-full bg-transparent text-base font-medium px-1 py-1.5 focus:outline-none ${
                  hasError
                    ? ''
                    : 'text-[var(--fg-strong)] placeholder:text-[var(--fg-subtle)]'
                } ${searchMode !== 'text' ? 'font-mono' : ''} ${
                  showOverlay ? 'text-transparent caret-[var(--fg-strong)]' : ''
                }`}
              />
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-1 px-2 border-l border-[var(--border-default)]">
            <span className="shrink-0 px-2 py-1 rounded-md text-xs font-mono tabular-nums bg-[var(--bg-hover)] text-[var(--fg-default)]">
              <span className="text-[var(--fg-strong)]">{matchedCount}</span>
              <span className="text-[var(--fg-subtle)]"> / {total}</span>
            </span>

            {search.length > 0 && (
              <button type="button"
                onClick={() => { setSearch(''); }}
                className="shrink-0 p-1.5 rounded-md transition-colors text-[var(--fg-subtle)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-active)]"
                title={t('action.clear')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <IconChip disabled title={t('action.caseSensitive')} icon={CaseSensitive} />
            <IconChip disabled title={t('action.recent')} icon={History} />

            <kbd className="hidden md:inline-flex items-center justify-center mx-0.5 h-5 min-w-[18px] px-1 rounded-md text-2xs font-mono font-black bg-[var(--bg-hover)] text-[var(--fg-subtle)]">/</kbd>

            <button type="button"
              onClick={() => { setAdvOpen((v) => !v); }}
              title={t('action.advanced')}
              style={!advOpen && searchMode !== 'text'
                ? { background: 'color-mix(in srgb, var(--intent-success-vivid) 15%, transparent)', color: 'var(--intent-success-fg)' }
                : undefined}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 ml-0.5 rounded-md text-xs font-black uppercase tracking-eyebrow transition-colors ${
                advOpen
                  ? 'bg-[var(--fg-strong)] text-[var(--bg-surface)]'
                  : searchMode !== 'text'
                    ? ''
                    : 'text-[var(--fg-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--fg-strong)]'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              {t('action.advanced')}
              <ChevronDown className={`w-3 h-3 transition-transform ${advOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Inline error */}
        {hasError && (
          <div
            style={{ background: 'var(--intent-danger-bg)', color: 'var(--intent-danger-fg)' }}
            className="mx-3 mb-2 px-3 py-1.5 text-xs font-mono rounded-md"
          >
            ✕ {searchError}
          </div>
        )}

        {/* Advanced panel */}
        {advOpen && <AdvancedPanel mode={searchMode} setMode={setSearchMode} setSearch={setSearch} />}
      </GlassCard>
    </div>
  );
}

function PatternToggle({
  mode, setMode,
}: { mode: SearchMode; setMode: (m: SearchMode) => void }) {
  const { t } = useTranslation('search');
  const items: { id: SearchMode; label: string }[] = [
    { id: 'text',  label: '""' },
    { id: 'regex', label: '.*' },
    { id: 'dsl',   label: '[ ]' },
  ];
  return (
    <div className="flex items-stretch border-r border-[var(--border-default)]">
      {items.map(({ id, label }) => {
        const active = mode === id;
        return (
          <button type="button"
            key={id}
            onClick={() => { setMode(id); }}
            title={t(`mode.${id}.title`)}
            style={active ? { color: 'var(--intent-success-fg)' } : undefined}
            className={`px-2.5 font-mono text-sm font-black transition-colors ${
              active
                ? 'bg-[var(--bg-active)]'
                : 'text-[var(--fg-subtle)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function IconChip({
  disabled, title, icon: Icon, onClick,
}: {
  disabled?: boolean; title: string;
  icon: React.ComponentType<{ className?: string }>; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 p-1.5 rounded-md transition-colors ${
        disabled
          ? 'text-[var(--fg-subtle)]'
          : 'text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-active)]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// --- DSL tokenizer for syntax overlay ---

type TokenKind = 'numeric' | 'string' | 'flag' | 'quote' | 'op' | 'plain';
type Token = { text: string; kind: TokenKind; pos: number };

function tokenize(src: string, mode: SearchMode): Token[] {
  if (mode !== 'dsl') return [{ text: src, kind: 'plain', pos: 0 }];
  const out: Token[] = [];
  const re = /("[^"]*")|([+!][A-Za-z][\w]*)|([A-Za-z][\w]*):([><]?)([^\s]*)|(\s+)|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const pos = m.index;
    if (m[1]) {
      out.push({ text: m[1], kind: 'quote', pos });
    } else if (m[2]) {
      out.push({ text: m[2], kind: 'flag', pos });
    } else if (m[3]) {
      const key = m[3];
      const op = m[4] || '';
      const val = m[5] || '';
      const kind: TokenKind = NUMERIC_KEYS.has(key) ? 'numeric' : STRING_KEYS.has(key) ? 'string' : 'plain';
      let off = pos;
      out.push({ text: key, kind, pos: off }); off += key.length;
      out.push({ text: ':', kind: 'op', pos: off }); off += 1;
      if (op) { out.push({ text: op, kind: 'op', pos: off }); off += op.length; }
      if (val) out.push({ text: val, kind, pos: off });
    } else if (m[6]) {
      out.push({ text: m[6], kind: 'plain', pos });
    } else if (m[7]) {
      out.push({ text: m[7], kind: 'plain', pos });
    }
  }
  return out;
}

function tokenStyle(kind: TokenKind): { style?: React.CSSProperties; className?: string } {
  // Tonally consistent with the rest of the UI:
  // accent green for "live" tokens (numeric facets), theme-aware fg shades for everything else.
  switch (kind) {
    case 'numeric': return { style: { color: 'var(--intent-success-fg)' } };
    case 'string':  return { className: 'text-[var(--fg-strong)]' };
    case 'flag':    return { style: { color: 'var(--intent-success-fg)' } };
    case 'quote':   return { className: 'text-[var(--fg-default)]' };
    case 'op':      return { className: 'text-[var(--fg-subtle)]' };
    case 'plain':
    default:        return { className: 'text-[var(--fg-strong)]' };
  }
}

function AdvancedPanel({
  mode, setMode, setSearch,
}: {
  mode: SearchMode;
  setMode: (m: SearchMode) => void;
  setSearch: (s: string) => void;
}) {
  const { t } = useTranslation('search');
  const modes: { id: SearchMode; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'text',  icon: Search },
    { id: 'regex', icon: Regex },
    { id: 'dsl',   icon: Code2 },
  ];
  return (
    <div className="border-t border-[var(--border-default)] px-3 py-3 space-y-3">
      {/* Mode switch */}
      <div>
        <div className="text-2xs font-black uppercase tracking-eyebrow mb-1.5 text-[var(--fg-subtle)]">
          {t('mode.title')}
        </div>
        <div className="flex gap-1">
          {modes.map(({ id, icon: Icon }) => {
            const active = mode === id;
            return (
              <button type="button"
                key={id}
                onClick={() => { setMode(id); }}
                title={t(`mode.${id}.hint`)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-black uppercase tracking-eyebrow transition-colors ${
                  active
                    ? 'bg-[var(--fg-strong)] text-[var(--bg-surface)]'
                    : 'bg-[var(--bg-hover)] text-[var(--fg-muted)] hover:text-[var(--fg-strong)]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t(`mode.${id}.label`)}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-[var(--fg-subtle)]">
          {t(`mode.${mode}.hint`)}
        </p>
      </div>

      {/* Sample queries (only meaningful for DSL) */}
      {mode === 'dsl' && (
        <div>
          <div className="text-2xs font-black uppercase tracking-eyebrow mb-1.5 text-[var(--fg-subtle)]">
            {t('samples.title')}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SAMPLES.map((s) => (
              <button type="button"
                key={s.q}
                onClick={() => { setSearch(s.q); }}
                className="text-left px-2.5 py-1.5 rounded-md border text-xs transition-colors bg-[var(--bg-hover)] border-[var(--border-muted)] hover:bg-[var(--bg-active)] text-[var(--fg-default)]"
              >
                <div className="font-bold">{t(`samples.${s.i18nKey}`)}</div>
                <code className="text-2xs font-mono text-[var(--fg-subtle)]">{s.q}</code>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reference */}
      {mode === 'dsl' && (
        <div>
          <div className="text-2xs font-black uppercase tracking-eyebrow mb-1.5 text-[var(--fg-subtle)]">
            {t('reference.title')}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)]">
            <Doc syntax="key:>n / key:<n"   ex="complexity:>30" />
            <Doc syntax="key:value"          ex="layer:service" />
            <Doc syntax="!flag / +flag"      ex="!cyclic +dead" />
            <Doc syntax='"free text"'        ex='"AuthProvider"' />
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg-strong)]">
              {t('reference.allFields')}
            </summary>
            <div className="mt-2 text-xs space-y-1 text-[var(--fg-muted)]">
              <p><b>{t('reference.numeric')}</b> <code className="font-mono">complexity, cognitive, loc, fanIn, fanOut, churn, days, authors, prs, any, tsIgnore, unsafe, coverage, branch, mutation, eslintErr, eslintWarn, todos, console, sast, bundle, jsdoc, pagerank</code></p>
              <p><b>{t('reference.string')}</b> <code className="font-mono">status, layer, lang, owner, name, path</code></p>
              <p><b>{t('reference.flags')}</b> <code className="font-mono">cyclic, dead, deprecated, generated, test, secrets, strictOptOut, busFactor1, publicApi, hasTest</code></p>
            </div>
          </details>
        </div>
      )}

      {mode === 'regex' && (
        <p className="text-xs text-[var(--fg-muted)]">
          {t('regexHint.prefix')}<em>{t('regexHint.emphasis')}</em>{t('regexHint.suffix')}<code className="font-mono">{`<filename> + " " + <path>`}</code>.
        </p>
      )}
    </div>
  );
}

function Doc({ syntax, ex }: { syntax: string; ex: string }) {
  return (
    <div className="flex flex-col">
      <code className="font-mono font-bold">{syntax}</code>
      <code className="font-mono text-[var(--fg-subtle)]">{ex}</code>
    </div>
  );
}
