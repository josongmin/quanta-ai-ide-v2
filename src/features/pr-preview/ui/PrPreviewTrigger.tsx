import {
  forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import {
  GitPullRequest, Plus, Pencil, Minus, Shuffle, X, Waves, type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { GlassCard, Portal } from '@shared/ui';
import { useFilterStore } from '@features/filter-files';
import { useStack } from '@features/inspect-target';
import { usePrPreview } from '../model/usePrPreview';
import type { FileRecord, PRChangeKind } from '@entities/repo';

// GNB-mounted PR preview entry point.
//
// The button itself nests with the rest of the GNB icon row. Because the
// GNB header runs `overflow: hidden` (it owns a stacking context for stage
// labels), the popover panel can't be a direct DOM child of the trigger —
// it would get clipped. We render the panel through a Portal at fixed
// coordinates measured from the trigger's bounding rect, then keep that
// position in sync on scroll/resize.
//
// Idle  — single icon, no count.
// Active — icon + status dot + total-changes count badge. Clicking opens
//          the popover with the meta strip + change list.

const KIND_DOT_POPOVER: Record<PRChangeKind, string> = {
  added:    'rgba(95,168,108,0.85)',
  modified: 'rgba(168,137,58,0.80)',
  deleted:  'rgba(168,113,110,0.85)',
};

// Flat-style: the kind badge shows a small low-chroma dot next to a neutral
// number. Saturated coloured text on every badge competes with the rest of
// the bar; the dot is enough cue.
const KIND_DOT_BAR: Record<PRChangeKind, string> = {
  added:    'rgba(95,168,108,0.75)',
  modified: 'rgba(168,137,58,0.70)',
  deleted:  'rgba(168,113,110,0.75)',
};

// Flat-style: rows are differentiated by icon shape alone (Plus / Pencil /
// Minus). No coloured stripe, no tinted background, no full-colour glyph —
// the icon outline carries the signal and the file name reads first.
const KIND_ICON: Record<PRChangeKind, LucideIcon> = {
  added:    Plus,
  modified: Pencil,
  deleted:  Minus,
};

type Counts = Record<PRChangeKind, number>;

const POPOVER_WIDTH = 360;
const POPOVER_OFFSET = 8;
const RIPPLE_CAP = 20;

export default function PrPreviewTrigger() {
  const { t } = useTranslation('diff');
  const { active, diff, seed, start, stop, regenerate } = usePrPreview();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  const counts = useMemo<Counts>(() => {
    const c: Counts = { added: 0, modified: 0, deleted: 0 };
    if (!diff) return c;
    for (const ch of diff.changes) c[ch.kind]++;
    return c;
  }, [diff]);

  // Place the popover under the trigger, right-aligned to its right edge.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({
        top: r.bottom + POPOVER_OFFSET,
        right: window.innerWidth - r.right,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  // Click-outside + Esc close.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Auto-close when the session ends elsewhere is handled by deriving
  // `effectiveOpen` from `active && open` at render — no effect needed.

  const handleClick = () => {
    if (!active || !diff) {
      start();
      return;
    }
    setOpen((v) => !v);
  };

  const isActive = active && !!diff;
  // Effective open state — only meaningful while a session is active.
  const effectiveOpen = open && isActive;
  const labelIdle = t('preview.openLabel');
  const labelActive = t('preview.openTitle');

  return (
    <>
      <TriggerButton
        ref={triggerRef}
        active={isActive}
        open={effectiveOpen}
        onClick={handleClick}
        counts={counts}
        idleLabel={labelIdle}
        activeLabel={labelActive}
      />
      {effectiveOpen && diff && coords && (
        <Portal>
          <div
            ref={panelRef}
            role="dialog"
            aria-label={labelActive}
            className="fixed z-[var(--z-dropdown)] pop-in"
            style={{
              top: coords.top,
              right: coords.right,
              width: POPOVER_WIDTH,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <PreviewPopoverPanel
              counts={counts}
              filesChanged={diff.changes.length}
              ripple={diff.affected.length}
              seed={seed}
              onRegenerate={regenerate}
              onStop={() => { stop(); setOpen(false); }}
              t={t}
            />
          </div>
        </Portal>
      )}
    </>
  );
}

// ─── Trigger button ───────────────────────────────────────────────────────

type TriggerProps = {
  active: boolean;
  open: boolean;
  onClick: () => void;
  counts: Counts;
  idleLabel: string;
  activeLabel: string;
};

const TriggerButton = forwardRef<HTMLButtonElement, TriggerProps>(function TriggerButton(
  { active, open, onClick, counts, idleLabel, activeLabel }, ref,
) {
  const totalChanges = counts.added + counts.modified + counts.deleted;

  // Sizing matches the surrounding IconButton row (32×32) when idle, then
  // expands horizontally to host the count badge when active. Vertical
  // metrics stay constant so the button doesn't bump the GNB rhythm.
  const style: React.CSSProperties = {
    height: 32,
    color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
    background: open ? 'var(--bg-hover)' : 'transparent',
    border: '1px solid',
    borderColor: active ? 'var(--border-default)' : 'transparent',
    borderRadius: 'var(--radius-md)',
    transition: 'background-color 120ms ease, color 120ms ease, border-color 120ms ease, padding 200ms cubic-bezier(0.22, 1, 0.36, 1)',
    paddingInline: active ? 8 : 0,
    minWidth: 32,
    cursor: 'pointer',
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={active ? activeLabel : idleLabel}
      title={active ? activeLabel : idleLabel}
      aria-expanded={active ? open : undefined}
      onClick={onClick}
      style={style}
      className="relative inline-flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 hover:[background:var(--bg-hover)]"
    >
      <GitPullRequest className="w-4 h-4 shrink-0" />
      {active && (
        <>
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--intent-success-vivid, #4f9a5c)' }}
          />
          <span
            className="text-[10px] font-mono tabular-nums"
            style={{ color: 'var(--fg-muted)' }}
          >
            {totalChanges}
          </span>
        </>
      )}
    </button>
  );
});

// ─── Popover panel ────────────────────────────────────────────────────────

function PreviewPopoverPanel({
  counts, filesChanged, ripple, seed, onRegenerate, onStop, t,
}: {
  counts: Counts;
  filesChanged: number;
  ripple: number;
  seed: number | null;
  onRegenerate: () => void;
  onStop: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div
      className="rounded-xl border shadow-2xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-default)',
        maxHeight: 'min(70vh, 560px)',
      }}
    >
      <header
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <GitPullRequest
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: 'var(--fg-muted)' }}
          aria-hidden="true"
        />
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-strong)' }}
        >
          {t('preview.filesChanged', { count: filesChanged, defaultValue: `${filesChanged} files changed` })}
        </span>
        <span
          aria-hidden
          className="inline-flex items-center gap-1 text-[10px] font-bold tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <Waves className="w-3 h-3" />
          {ripple}
        </span>
        {seed !== null && (
          <span
            className="text-[9px] font-mono px-1.5 py-px rounded-md"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
            }}
            title={`seed ${seed}`}
          >
            #{seed}
          </span>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onRegenerate}
          aria-label={t('preview.regenerateAria')}
          title={t('preview.regenerateTitle')}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md outline-none transition-colors hover:[background:var(--bg-hover)] focus-visible:ring-2"
          style={{ color: 'var(--fg-muted)' }}
        >
          <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onStop}
          aria-label={t('preview.closeAria')}
          title={t('preview.closeTitle')}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md outline-none transition-colors hover:[background:var(--bg-hover)] focus-visible:ring-2"
          style={{ color: 'var(--fg-muted)' }}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </header>

      <div
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
        style={{ borderColor: 'var(--border-muted)' }}
        role="group"
        aria-label={t('preview.changeCountsAria')}
      >
        <PopoverKindBadge kind="added" icon={Plus} value={counts.added} />
        <PopoverKindBadge kind="modified" icon={Pencil} value={counts.modified} />
        <PopoverKindBadge kind="deleted" icon={Minus} value={counts.deleted} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <PrChangeList />
      </div>
    </div>
  );
}

function PopoverKindBadge({
  kind, icon: Icon, value,
}: {
  kind: PRChangeKind;
  icon: typeof Plus;
  value: number;
}) {
  const dot = KIND_DOT_POPOVER[kind];
  const dim = value === 0;
  return (
    <span
      aria-label={`${kind} ${value}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.18em] tabular-nums"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        opacity: dim ? 0.4 : 1,
      }}
    >
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dot }}
      />
      <Icon className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} aria-hidden="true" />
      {value}
    </span>
  );
}

// ─── PR change list ───────────────────────────────────────────────────────

export function PrChangeList() {
  const { isDark } = useTheme();
  const { active, diff } = usePrPreview();
  const repo = useFilterStore((s) => s.repo);
  const { open } = useStack();

  if (!active || !diff) return null;

  const openFile = (id: number) => { open({ kind: 'file', id }); };
  const files = repo.files;
  const ripple = diff.affected;
  const rippleVisible = ripple.slice(0, RIPPLE_CAP);
  const rippleHidden = Math.max(0, ripple.length - RIPPLE_CAP);

  return (
    <div className="p-2">
      <SectionLabel isDark={isDark} text="Changes" count={diff.changes.length} />
      <div className="flex flex-col gap-0.5 mb-2">
        {diff.changes.map((ch) => {
          const f = files[ch.id];
          if (!f) return null;
          return (
            <ChangeRow
              key={`c-${ch.id}`}
              isDark={isDark}
              file={f}
              kind={ch.kind}
              onClick={() => { openFile(ch.id); }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <Waves
          className={`w-3 h-3 ${isDark ? 'text-white/40' : 'text-black/40'}`}
          aria-hidden="true"
        />
        <SectionLabel isDark={isDark} text="Ripple" count={ripple.length} inline />
      </div>
      {ripple.length === 0 ? (
        <div
          className={`px-1 py-1 text-[10px] ${isDark ? 'text-white/40' : 'text-black/40'}`}
        >
          No transitive impact.
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {rippleVisible.map((id) => {
            const f = files[id];
            if (!f) return null;
            return (
              <ChangeRow
                key={`a-${id}`}
                isDark={isDark}
                file={f}
                kind={null}
                onClick={() => { openFile(id); }}
              />
            );
          })}
          {rippleHidden > 0 && (
            <div
              className={`px-2 py-1 text-[10px] font-mono ${
                isDark ? 'text-white/40' : 'text-black/40'
              }`}
            >
              +{rippleHidden} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({
  isDark, text, count, inline = false,
}: {
  isDark: boolean;
  text: string;
  count: number;
  inline?: boolean;
}) {
  return (
    <div
      className={`${inline ? '' : 'mb-1.5 px-1'} flex items-baseline gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${
        isDark ? 'text-white/40' : 'text-black/40'
      }`}
    >
      <span>{text}</span>
      <span className={`tabular-nums ${isDark ? 'text-white/30' : 'text-black/30'}`}>
        {count}
      </span>
    </div>
  );
}

function ChangeRow({
  isDark, file, kind, onClick,
}: {
  isDark: boolean;
  file: FileRecord;
  kind: PRChangeKind | null;
  onClick: () => void;
}) {
  const Icon = kind ? KIND_ICON[kind] : null;
  const folder = file.folderPath.split('.').join('/');
  return (
    <button
      type="button"
      onClick={onClick}
      title={kind ?? 'rippled'}
      className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
        isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]'
      }`}
    >
      <span
        className={`inline-flex items-center justify-center w-3.5 h-3.5 shrink-0 ${
          isDark ? 'text-white/45' : 'text-black/45'
        }`}
        aria-hidden="true"
      >
        {Icon
          ? <Icon className="w-3 h-3" />
          : <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-white/30' : 'bg-black/25'}`} />}
      </span>
      <span
        className={`text-[11px] font-bold font-mono truncate ${
          isDark ? 'text-white/85' : 'text-black/85'
        }`}
      >
        {file.name}
      </span>
      <span
        className={`text-[9px] font-mono truncate ${
          isDark ? 'text-white/40' : 'text-black/40'
        }`}
      >
        {folder}
      </span>
    </button>
  );
}

// ─── Standalone bar (alternative entry; non-portal, GlassCard wrapper) ────

export function PrPreviewBar() {
  const { isDark } = useTheme();
  const { t } = useTranslation('diff');
  const { active, diff, seed, start, stop, regenerate } = usePrPreview();

  // Tally per-kind counts once. We intentionally walk the array instead of
  // filtering three times — the diff is small but this stays O(N).
  const counts = useMemo<Counts>(() => {
    const c: Counts = { added: 0, modified: 0, deleted: 0 };
    if (!diff) return c;
    for (const ch of diff.changes) c[ch.kind]++;
    return c;
  }, [diff]);

  if (!active || !diff) {
    return (
      <GlassCard className="p-2">
        <button
          type="button"
          onClick={start}
          aria-label={t('preview.openLabel')}
          title={t('preview.openTitle')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
            isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('preview.openLabel')}</span>
        </button>
      </GlassCard>
    );
  }

  const filesChanged = diff.changes.length;
  const ripple = diff.affected.length;

  return (
    <GlassCard className="p-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-1">
          <GitPullRequest
            className={`w-3.5 h-3.5 ${isDark ? 'text-white/70' : 'text-black/70'}`}
            aria-hidden="true"
          />
          <span
            className={`text-[10px] font-black uppercase tracking-[0.18em] ${
              isDark ? 'text-white/85' : 'text-black/85'
            }`}
          >
            {filesChanged} files changed
          </span>
          <span
            className={`text-[10px] font-mono ${
              isDark ? 'text-white/40' : 'text-black/40'
            }`}
          >
            ·
          </span>
          <span
            className={`text-[10px] font-bold tabular-nums ${
              isDark ? 'text-white/55' : 'text-black/55'
            }`}
          >
            {ripple} ripple
          </span>
          {seed !== null && (
            <span
              className={`ml-1 text-[9px] font-mono px-1 py-0.5 rounded-md ${
                isDark ? 'bg-white/5 text-white/40' : 'bg-black/5 text-black/40'
              }`}
              title={`seed ${seed}`}
            >
              #{seed}
            </span>
          )}
        </div>

        <div
          className={`h-3 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
          aria-hidden="true"
        />

        <div className="flex items-center gap-1" role="group" aria-label={t('preview.changeCountsAria')}>
          <BarKindBadge isDark={isDark} kind="added"    icon={Plus}   value={counts.added} />
          <BarKindBadge isDark={isDark} kind="modified" icon={Pencil} value={counts.modified} />
          <BarKindBadge isDark={isDark} kind="deleted"  icon={Minus}  value={counts.deleted} />
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={regenerate}
          aria-label={t('preview.regenerateAria')}
          title={t('preview.regenerateTitle')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
            isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('preview.regenerate')}</span>
        </button>
        <button
          type="button"
          onClick={stop}
          aria-label={t('preview.closeAria')}
          title={t('preview.closeTitle')}
          className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
            isDark ? 'text-white/55 hover:bg-white/5 hover:text-white/85' : 'text-black/55 hover:bg-black/5 hover:text-black/85'
          }`}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </GlassCard>
  );
}

function BarKindBadge({
  isDark, kind, icon: Icon, value,
}: {
  isDark: boolean;
  kind: PRChangeKind;
  icon: typeof Plus;
  value: number;
}) {
  const dot = KIND_DOT_BAR[kind];
  const dim = value === 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.18em] tabular-nums ${
        isDark ? 'bg-white/[0.04] text-white/70' : 'bg-black/[0.04] text-black/70'
      } ${dim ? 'opacity-40' : ''}`}
      aria-label={`${kind} ${value}`}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dot }}
      />
      <Icon
        className={`w-3 h-3 ${isDark ? 'text-white/55' : 'text-black/55'}`}
        aria-hidden="true"
      />
      {value}
    </span>
  );
}
