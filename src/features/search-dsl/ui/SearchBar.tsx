import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Code2, Regex, CaseSensitive, ChevronDown, History, SlidersHorizontal } from 'lucide-react';
import { useFilterStore } from '@features/filter-files';
import { useTheme } from '@shared/theme';
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
  const { isDark } = useTheme();
  const { t } = useTranslation('search');
  // Narrow selectors. Action setters in zustand are reference-stable, so
  // selecting them individually avoids the shallow-equality cost from the
  // legacy `useFilter()` shape and prevents extraneous re-renders when
  // unrelated store fields change. Hot-path: `search` updates on every
  // keystroke, so the per-field subscriptions stay localised.
  const search = useFilterStore((s) => s.state.search);
  const searchMode = useFilterStore((s) => s.state.searchMode);
  const matchedCount = useFilterStore((s) => s.matchedCount);
  const repo = useFilterStore((s) => s.repo);
  const searchError = useFilterStore((s) => s.searchError);
  const setSearch = useFilterStore((s) => s.setSearch);
  const setSearchMode = useFilterStore((s) => s.setSearchMode);
  const [advOpen, setAdvOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = repo.files.length;
  const hasError = Boolean(searchError) && search.length > 0;
  const placeholder = t(`placeholder.${searchMode}`);

  // "/" focuses the input (Sourcegraph-style global hotkey)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);

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
          <PatternToggle dark={isDark} mode={searchMode} setMode={setSearchMode} />

          {/* Input area */}
          <div className="relative flex-1 min-w-0 flex items-center px-2">
            <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-white/55' : 'text-black/55'}`} />
            <div className="relative flex-1 min-w-0 ml-1">
              {showOverlay && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 flex items-center px-1 py-1.5 font-mono text-[12px] whitespace-pre overflow-hidden"
                >
                  {tokens.map((t) => (
                    <span key={`${String(t.pos)}-${t.kind}`} className={tokenClass(t.kind, isDark)}>{t.text}</span>
                  ))}
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
                className={`relative w-full bg-transparent text-[12px] font-medium px-1 py-1.5 focus:outline-none ${
                  hasError
                    ? 'text-red-400'
                    : isDark ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'
                } ${searchMode !== 'text' ? 'font-mono' : ''} ${
                  showOverlay ? `text-transparent ${isDark ? 'caret-white' : 'caret-black'}` : ''
                }`}
              />
            </div>
          </div>

          {/* Right cluster */}
          <div className={`flex items-center gap-1 px-2 border-l ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <span className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-mono tabular-nums ${
              isDark ? 'bg-white/5 text-white/70' : 'bg-black/5 text-black/70'
            }`}>
              <span className={isDark ? 'text-white' : 'text-black'}>{matchedCount}</span>
              <span className={isDark ? 'text-white/30' : 'text-black/30'}> / {total}</span>
            </span>

            {search.length > 0 && (
              <button type="button"
                onClick={() => { setSearch(''); }}
                className={`shrink-0 p-1.5 rounded-md transition-colors ${
                  isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-black/40 hover:text-black hover:bg-black/10'
                }`}
                title={t('action.clear')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <IconChip dark={isDark} disabled title={t('action.caseSensitive')} icon={CaseSensitive} />
            <IconChip dark={isDark} disabled title={t('action.recent')} icon={History} />

            <kbd className={`hidden md:inline-flex items-center justify-center mx-0.5 h-5 min-w-[18px] px-1 rounded-md text-[9px] font-mono font-black ${
              isDark ? 'bg-white/5 text-white/40' : 'bg-black/5 text-black/40'
            }`}>/</kbd>

            <button type="button"
              onClick={() => { setAdvOpen((v) => !v); }}
              title={t('action.advanced')}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 ml-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                advOpen
                  ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                  : searchMode !== 'text'
                    ? (isDark ? 'bg-[#4f9a5c]/15 text-[#4f9a5c]' : 'bg-[#4f9a5c]/15 text-emerald-700')
                    : (isDark ? 'text-white/55 hover:bg-white/10 hover:text-white' : 'text-black/55 hover:bg-black/10 hover:text-black')
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
          <div className={`mx-3 mb-2 px-3 py-1.5 text-[10px] font-mono rounded-md ${
            isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-500/10 text-red-700'
          }`}>
            ✕ {searchError}
          </div>
        )}

        {/* Advanced panel */}
        {advOpen && <AdvancedPanel dark={isDark} mode={searchMode} setMode={setSearchMode} setSearch={setSearch} />}
      </GlassCard>
    </div>
  );
}

function PatternToggle({
  dark, mode, setMode,
}: { dark: boolean; mode: SearchMode; setMode: (m: SearchMode) => void }) {
  const { t } = useTranslation('search');
  const items: { id: SearchMode; label: string }[] = [
    { id: 'text',  label: '""' },
    { id: 'regex', label: '.*' },
    { id: 'dsl',   label: '[ ]' },
  ];
  return (
    <div className={`flex items-stretch border-r ${dark ? 'border-white/10' : 'border-black/10'}`}>
      {items.map(({ id, label }) => {
        const active = mode === id;
        return (
          <button type="button"
            key={id}
            onClick={() => { setMode(id); }}
            title={t(`mode.${id}.title`)}
            className={`px-2.5 font-mono text-[11px] font-black transition-colors ${
              active
                ? (dark ? 'bg-white/10 text-[#4f9a5c]' : 'bg-black/5 text-emerald-700')
                : (dark ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-black/40 hover:text-black hover:bg-black/5')
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
  dark, disabled, title, icon: Icon, onClick,
}: {
  dark: boolean; disabled?: boolean; title: string;
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
          ? (dark ? 'text-white/30' : 'text-black/30')
          : (dark ? 'text-white/55 hover:text-white hover:bg-white/10' : 'text-black/55 hover:text-black hover:bg-black/10')
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

function tokenClass(kind: TokenKind, dark: boolean): string {
  // Tonally consistent with the rest of the UI:
  // accent green for "live" tokens (numeric facets), white/black alpha shades for everything else.
  switch (kind) {
    case 'numeric': return dark ? 'text-[#4f9a5c]' : 'text-emerald-700';
    case 'string':  return dark ? 'text-white' : 'text-black';
    case 'flag':    return dark ? 'text-[#4f9a5c]' : 'text-emerald-700';
    case 'quote':   return dark ? 'text-white/85' : 'text-black/85';
    case 'op':      return dark ? 'text-white/40' : 'text-black/40';
    case 'plain':
    default:        return dark ? 'text-white' : 'text-black';
  }
}

function AdvancedPanel({
  dark, mode, setMode, setSearch,
}: {
  dark: boolean;
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
    <div className={`border-t ${dark ? 'border-white/10' : 'border-black/10'} px-3 py-3 space-y-3`}>
      {/* Mode switch */}
      <div>
        <div className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1.5 ${dark ? 'text-white/40' : 'text-black/40'}`}>
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
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                  active
                    ? (dark ? 'bg-white text-black' : 'bg-black text-white')
                    : (dark ? 'bg-white/5 text-white/55 hover:text-white' : 'bg-black/5 text-black/55 hover:text-black')
                }`}
              >
                <Icon className="w-3 h-3" />
                {t(`mode.${id}.label`)}
              </button>
            );
          })}
        </div>
        <p className={`mt-1.5 text-[10px] ${dark ? 'text-white/40' : 'text-black/40'}`}>
          {t(`mode.${mode}.hint`)}
        </p>
      </div>

      {/* Sample queries (only meaningful for DSL) */}
      {mode === 'dsl' && (
        <div>
          <div className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1.5 ${dark ? 'text-white/40' : 'text-black/40'}`}>
            {t('samples.title')}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SAMPLES.map((s) => (
              <button type="button"
                key={s.q}
                onClick={() => { setSearch(s.q); }}
                className={`text-left px-2.5 py-1.5 rounded-md border text-[10px] transition-colors ${
                  dark
                    ? 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70'
                    : 'bg-black/5 border-black/5 hover:bg-black/10 text-black/70'
                }`}
              >
                <div className="font-bold">{t(`samples.${s.i18nKey}`)}</div>
                <code className={`text-[9px] font-mono ${dark ? 'text-white/40' : 'text-black/40'}`}>{s.q}</code>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reference */}
      {mode === 'dsl' && (
        <div>
          <div className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1.5 ${dark ? 'text-white/40' : 'text-black/40'}`}>
            {t('reference.title')}
          </div>
          <div className={`grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] ${dark ? 'text-white/55' : 'text-black/55'}`}>
            <Doc syntax="key:>n / key:<n"   ex="complexity:>30" dark={dark} />
            <Doc syntax="key:value"          ex="layer:service" dark={dark} />
            <Doc syntax="!flag / +flag"      ex="!cyclic +dead" dark={dark} />
            <Doc syntax='"free text"'        ex='"AuthProvider"' dark={dark} />
          </div>
          <details className="mt-2">
            <summary className={`cursor-pointer text-[10px] font-bold ${dark ? 'text-white/55 hover:text-white' : 'text-black/55 hover:text-black'}`}>
              {t('reference.allFields')}
            </summary>
            <div className={`mt-2 text-[10px] space-y-1 ${dark ? 'text-white/55' : 'text-black/55'}`}>
              <p><b>{t('reference.numeric')}</b> <code className="font-mono">complexity, cognitive, loc, fanIn, fanOut, churn, days, authors, prs, any, tsIgnore, unsafe, coverage, branch, mutation, eslintErr, eslintWarn, todos, console, sast, bundle, jsdoc, pagerank</code></p>
              <p><b>{t('reference.string')}</b> <code className="font-mono">status, layer, lang, owner, name, path</code></p>
              <p><b>{t('reference.flags')}</b> <code className="font-mono">cyclic, dead, deprecated, generated, test, secrets, strictOptOut, busFactor1, publicApi, hasTest</code></p>
            </div>
          </details>
        </div>
      )}

      {mode === 'regex' && (
        <p className={`text-[10px] ${dark ? 'text-white/55' : 'text-black/55'}`}>
          {t('regexHint.prefix')}<em>{t('regexHint.emphasis')}</em>{t('regexHint.suffix')}<code className="font-mono">{`<filename> + " " + <path>`}</code>.
        </p>
      )}
    </div>
  );
}

function Doc({ syntax, ex, dark }: { syntax: string; ex: string; dark: boolean }) {
  return (
    <div className="flex flex-col">
      <code className="font-mono font-bold">{syntax}</code>
      <code className={`font-mono ${dark ? 'text-white/30' : 'text-black/30'}`}>{ex}</code>
    </div>
  );
}
