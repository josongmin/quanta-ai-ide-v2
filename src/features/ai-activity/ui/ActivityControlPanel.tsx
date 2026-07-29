import { useRef } from 'react';
import { useTranslation } from '@shared/i18n';
import { Switch, SegmentedControl, useDialogA11y } from '@shared/ui';
import { useActivityStore, type Speed, type Intensity } from '../model/activityStore';

// Modal — anchored to the right side. Opens via the GNB button (AppShell).
// All controls write through the store's `setPref` action which persists
// to localStorage automatically.
//
// A11y: `useDialogA11y` handles ESC-to-close, focus trap (Tab cycles within),
// auto-focus first interactive on open, and focus restore to the opener on
// close.

export function ActivityControlPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('prefs');
  const prefs = useActivityStore((s) => s.prefs);
  const setPref = useActivityStore((s) => s.setPref);
  const reset = useActivityStore((s) => s.resetPrefs);
  const dialogRef = useRef<HTMLElement>(null);
  useDialogA11y(dialogRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end pt-14 pr-4 pointer-events-none"
    >
      {/* Click-outside backdrop */}
      <button
        type="button"
        aria-label={t('aiActivity.closeBackdrop', { defaultValue: 'Close panel' })}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-auto"
        onClick={onClose}
      />

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-activity-panel-title"
        tabIndex={-1}
        className="relative w-[320px] rounded-xl border shadow-2xl pointer-events-auto outline-none"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-default)',
          color: 'var(--fg-default)',
        }}
      >
        <header
          className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <h2 id="ai-activity-panel-title" className="text-base font-black uppercase tracking-eyebrow">
            {t('aiActivity.title', { defaultValue: 'AI Activity' })}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
            {t('aiActivity.hint', { defaultValue: 'Show what the AI is touching, in real time.' })}
          </p>
        </header>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <Switch
            label={t('aiActivity.enabled', { defaultValue: 'Enable' })}
            checked={prefs.enabled}
            onChange={(v) => { setPref('enabled', v); }}
            primary
          />

          <Section title={t('aiActivity.source', { defaultValue: 'Source' })}>
            <Switch
              label={t('aiActivity.demoMode', { defaultValue: 'Demo mode' })}
              checked={prefs.demoMode}
              onChange={(v) => { setPref('demoMode', v); }}
              disabled={!prefs.enabled}
            />
            <p className="text-xs leading-snug" style={{ color: 'var(--fg-subtle)' }}>
              {t('aiActivity.demoModeHint', {
                defaultValue: 'Synthesize fake chat sessions when no real ChatAgent activity is being produced. Turn off to see only real activity.',
              })}
            </p>
          </Section>

          <Section title={t('aiActivity.layers', { defaultValue: 'Layers' })}>
            <Switch
              label={t('aiActivity.ring', { defaultValue: 'Pulsing rings on dots' })}
              checked={prefs.showRing}
              onChange={(v) => { setPref('showRing', v); }}
              disabled={!prefs.enabled}
            />
            <Switch
              label={t('aiActivity.line', { defaultValue: 'Connection lines from chat' })}
              checked={prefs.showLine}
              onChange={(v) => { setPref('showLine', v); }}
              disabled={!prefs.enabled}
            />
            <Switch
              label={t('aiActivity.zone', { defaultValue: 'Folder zone outline' })}
              checked={prefs.showZone}
              onChange={(v) => { setPref('showZone', v); }}
              disabled={!prefs.enabled}
            />
          </Section>

          <Section title={t('aiActivity.motion', { defaultValue: 'Motion' })}>
            <SegmentedControl<Speed>
              value={prefs.speed}
              onChange={(v) => { setPref('speed', v); }}
              options={[
                { value: 'slow',   label: t('aiActivity.speed.slow',   { defaultValue: 'Slow' }) },
                { value: 'normal', label: t('aiActivity.speed.normal', { defaultValue: 'Normal' }) },
                { value: 'fast',   label: t('aiActivity.speed.fast',   { defaultValue: 'Fast' }) },
              ]}
              disabled={!prefs.enabled}
            />
            <SegmentedControl<Intensity>
              value={prefs.intensity}
              onChange={(v) => { setPref('intensity', v); }}
              options={[
                { value: 'subtle', label: t('aiActivity.intensity.subtle', { defaultValue: 'Subtle' }) },
                { value: 'normal', label: t('aiActivity.intensity.normal', { defaultValue: 'Normal' }) },
                { value: 'loud',   label: t('aiActivity.intensity.loud',   { defaultValue: 'Loud' }) },
              ]}
              disabled={!prefs.enabled}
            />
          </Section>

          <Section title={t('aiActivity.cap', { defaultValue: 'Limits' })}>
            <label className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--fg-muted)' }}>
                {t('aiActivity.maxConcurrent', { defaultValue: 'Max concurrent' })}
              </span>
              <select
                value={prefs.maxConcurrent}
                onChange={(e) => { setPref('maxConcurrent', Number(e.target.value)); }}
                disabled={!prefs.enabled}
                className="text-sm tabular-nums px-2 py-1 rounded-md border disabled:opacity-50"
                style={{
                  background: 'var(--bg-surface-muted)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--fg-default)',
                }}
              >
                {[3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </Section>

          <div
            className="pt-3 mt-2 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <button
              type="button"
              onClick={reset}
              className="text-sm uppercase tracking-eyebrow font-bold hover:opacity-100"
              style={{ color: 'var(--fg-muted)' }}
            >
              {t('aiActivity.resetDefaults', { defaultValue: 'Reset to defaults' })}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm uppercase tracking-eyebrow font-bold px-3 py-1.5 rounded-md hover-surface"
              style={{
                background: 'var(--bg-surface-muted)',
                color: 'var(--fg-default)',
              }}
            >
              {t('aiActivity.done', { defaultValue: 'Done' })}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Internal primitives ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3
        className="text-2xs font-black uppercase tracking-eyebrow"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

