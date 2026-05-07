# Design Token System

Three tiers, mirroring the convention used by Material, Primer and Salesforce Lightning:

| Tier            | File             | Consumers                          |
| --------------- | ---------------- | ---------------------------------- |
| 1 · Primitives  | `primitives.ts`  | only the semantic + component tier |
| 2 · Semantic    | `semantic.ts`    | feature code (via CSS vars)        |
| 3 · Components  | `components.ts`  | shared UI primitives               |

`applyTokens(theme)` emits everything onto `:root` as CSS custom properties. Call it once on mount and again on every theme switch (it overwrites the theme-specific subset; the primitive scale is theme-agnostic and emitted just once).

## How to use

### Inline style

```tsx
<div style={{
  background: 'var(--bg-elevated)',
  color: 'var(--fg-default)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
}} />
```

### Tailwind arbitrary values

Because every primitive is now a CSS var on `:root`, Tailwind arbitrary syntax can consume them:

```tsx
<span className="text-[var(--fs-sm)] font-[var(--fw-medium)] tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]" />
<div  className="bg-[var(--bg-surface)] p-[var(--space-3)] rounded-[var(--radius-md)]" />
```

Do **not** hardcode `text-[10.5px]` or `bg-white/[0.04]`. Use a token.

---

## CSS variable catalog

### Surfaces (theme-aware)

```
--bg-canvas          page background
--bg-surface         card / panel surface
--bg-surface-muted   muted secondary surface
--bg-overlay         semi-transparent overlay
--bg-elevated        popover / dropdown / menu
--bg-hover           hover-state overlay
--bg-active          active / pressed overlay
--bg-selected        selected row / item
--bg-scrim           modal backdrop
```

### Foreground (theme-aware)

```
--fg-strong          headings / emphasized
--fg-default         body text
--fg-muted           secondary text
--fg-subtle          tertiary / disabled
--fg-on-accent       text over an accent fill
--fg-link            hyperlink color
--fg-accent          primary brand accent
```

### Borders (theme-aware)

```
--border-default
--border-muted
--border-strong
--border-focus       focus-ring color
```

### Shadows (theme-aware)

```
--shadow-sm
--shadow-md
--shadow-lg
```

### Intent (theme-aware)

```
--intent-success-fg / --intent-success-bg / --intent-success-vivid
--intent-warn-fg    / --intent-warn-bg    / --intent-warn-vivid
--intent-danger-fg  / --intent-danger-bg  / --intent-danger-vivid
--intent-info-fg    / --intent-info-bg
--intent-neutral-fg / --intent-neutral-bg
```

### Identity / Intensity (theme-aware)

```
--identity-stable / --identity-modified / --identity-vulnerable / --identity-out-of-scope
--intensity-warm  / --intensity-cool    / --intensity-neutral
```

### Spacing scale (theme-agnostic)

```
--space-0   0px      --space-4    16px
--space-0-5 2px      --space-5    20px
--space-1   4px      --space-6    24px
--space-1-5 6px      --space-8    32px
--space-2   8px      --space-10   40px
--space-3   12px     --space-12   48px
```

### Radius scale (theme-agnostic)

```
--radius-none / --radius-xs / --radius-sm / --radius-md / --radius-lg
--radius-xl   / --radius-2xl / --radius-3xl / --radius-pill
```

### Font-size scale (theme-agnostic)

```
--fs-2xs  9px    --fs-lg   14px
--fs-xs   10px   --fs-xl   16px
--fs-sm   11px   --fs-2xl  18px
--fs-base 12px   --fs-3xl  22px
--fs-md   13px   --fs-4xl  28px
```

### Font-weight scale (theme-agnostic)

```
--fw-regular 400 / --fw-medium 500 / --fw-semibold 600 / --fw-bold 700 / --fw-black 900
```

### Tracking scale (theme-agnostic)

```
--track-tight  -0.01em
--track-normal 0
--track-wide   0.05em
--track-wider  0.10em
--track-widest 0.25em
--track-eyebrow 0.18em   ← use this for ALL eyebrow / micro-caps text
```

### Component tokens

```
--card-padding / --card-padding-compact / --card-radius / --card-gap
--chip-padding / --chip-radius
--pill-padding / --pill-padding-compact / --pill-radius
--panel-width  / --panel-inset
--header-height / --header-padding-x
--tab-indicator-h / --dropdown-width
--glass-blur / --glass-fill-alpha-dark / --glass-fill-alpha-light
```

---

## Hard rules for feature code

1. **No `isDark ? ... : ...`** for colors — use a semantic CSS var. The theme already swaps it for you.
2. **No raw hex** — if a hue isn't in the scale, add it as a token first.
3. **No `bg-white/X` or `border-black/X`** — those bypass theme. Use `var(--bg-hover)` etc.
4. **No half-pixel font sizes** (`text-[10.5px]`) — pick the nearest `--fs-*`.
5. **One eyebrow tracking** — `--track-eyebrow`. Don't invent a new value.
