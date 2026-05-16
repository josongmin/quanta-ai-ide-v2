import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

// Token-driven theme that flips with the app's light/dark CSS variables.
// We deliberately keep the editor surface transparent so the GlassCard
// behind it shows through (preserves the app's glassmorphism).

const baseTheme = (isDark: boolean) =>
  EditorView.theme(
    {
      '&': {
        color: 'var(--fg-default)',
        background: 'transparent',
        height: '100%',
        fontSize: '13px',
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      },
      '.cm-content': {
        caretColor: 'var(--fg-default)',
        padding: '12px 0',
      },
      '.cm-scroller': {
        fontFamily: 'inherit',
        lineHeight: '1.55',
      },
      '.cm-gutters': {
        background: 'transparent',
        border: 'none',
        color: 'var(--fg-subtle)',
      },
      '.cm-activeLine': {
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
      },
      '.cm-activeLineGutter': {
        background: 'transparent',
        color: 'var(--fg-default)',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': {
        background: isDark ? 'rgba(120,170,255,0.22)' : 'rgba(60,120,220,0.18)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--fg-default)',
      },
      '.cm-tooltip': {
        background: 'var(--bg-surface)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-lg)',
        // Dark-only blur — light --bg-surface is opaque so blur produces
        // no visible refraction. Light mode policy: no backdrop-filter.
        ...(isDark ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } : {}),
      },
      '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        background: isDark ? 'rgba(120,170,255,0.18)' : 'rgba(60,120,220,0.14)',
        color: 'var(--fg-default)',
      },
      '.cm-tooltip-autocomplete ul li': {
        padding: '4px 8px',
      },
      '.cm-panels': {
        background: 'var(--bg-surface)',
        color: 'var(--fg-default)',
        borderTop: '1px solid var(--border-default)',
      },
      '.cm-panels input, .cm-panels button': {
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-muted)',
        borderRadius: '4px',
        padding: '2px 6px',
      },
      '.cm-foldPlaceholder': {
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-subtle)',
        border: '1px solid var(--border-muted)',
      },
      '.cm-lint-marker': { width: '0.9em', height: '0.9em' },
      '.cm-diagnostic': {
        background: 'var(--bg-surface)',
        color: 'var(--fg-default)',
        borderLeft: 'none',
      },
    },
    { dark: isDark },
  );

const lightHL = HighlightStyle.define([
  { tag: t.keyword, color: '#9333ea' },
  { tag: [t.string, t.special(t.string)], color: '#0a7d2c' },
  { tag: t.comment, color: '#6e7681', fontStyle: 'italic' },
  { tag: t.number, color: '#b45309' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#1d4ed8' },
  { tag: t.typeName, color: '#0e7490' },
  { tag: t.className, color: '#0e7490' },
  { tag: [t.propertyName, t.attributeName], color: '#1f2937' },
  { tag: t.operator, color: '#374151' },
  { tag: t.bracket, color: '#4b5563' },
  { tag: [t.tagName], color: '#be185d' },
  { tag: [t.heading], color: '#111', fontWeight: '700' },
  { tag: [t.link, t.url], color: '#1d4ed8', textDecoration: 'underline' },
  { tag: [t.bool, t.null], color: '#9333ea' },
]);

const darkHL = HighlightStyle.define([
  { tag: t.keyword, color: '#c084fc' },
  { tag: [t.string, t.special(t.string)], color: '#86efac' },
  { tag: t.comment, color: '#6e7681', fontStyle: 'italic' },
  { tag: t.number, color: '#fbbf24' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#93c5fd' },
  { tag: t.typeName, color: '#5eead4' },
  { tag: t.className, color: '#5eead4' },
  { tag: [t.propertyName, t.attributeName], color: '#e5e7eb' },
  { tag: t.operator, color: '#cbd5e1' },
  { tag: t.bracket, color: '#94a3b8' },
  { tag: [t.tagName], color: '#fb7185' },
  { tag: [t.heading], color: '#f1f5f9', fontWeight: '700' },
  { tag: [t.link, t.url], color: '#93c5fd', textDecoration: 'underline' },
  { tag: [t.bool, t.null], color: '#c084fc' },
]);

export function editorTheme(isDark: boolean): Extension[] {
  return [baseTheme(isDark), syntaxHighlighting(isDark ? darkHL : lightHL)];
}
