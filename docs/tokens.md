# Design tokens — contributor reference

Three tiers, emitted onto `:root` by `applyTokens(theme)`. Feature code consumes the **semantic** tier (CSS vars below) — never the raw primitives.

```
src/shared/tokens/
├── primitives.ts   — raw values (greys, greens, spacing scale, …)
├── semantic.ts     — role-mapped, theme-aware (dark + light)
├── components.ts   — shared component-level decisions
└── applyTokens.ts  — emits everything to :root as CSS vars
```

Quick-look the emitter at `src/shared/tokens/applyTokens.ts` for the full var-name catalog.

---

## Surfaces

| Token              | CSS var               | Role                          | Dark                    | Light                 |
| ------------------ | --------------------- | ----------------------------- | ----------------------- | --------------------- |
| `bgCanvas`         | `--bg-canvas`         | page background               | `#0a0d12`               | `#f4f6f9`             |
| `bgSurface`        | `--bg-surface`        | card / panel surface          | `#0d1117`               | `#ffffff`             |
| `bgSurfaceMuted`   | `--bg-surface-muted`  | nested fill, table-row stripe | `rgba(255,255,255,.03)` | `rgba(0,0,0,.03)`     |
| `bgOverlay`        | `--bg-overlay`        | sticky chrome / floating bar  | `rgba(13,17,23,.82)`    | `rgba(255,255,255,.85)` |
| `bgElevated`       | `--bg-elevated`       | popover / dropdown / modal    | `rgba(255,255,255,.06)` | `#ffffff`             |
| `bgHover`          | `--bg-hover`          | hover-state overlay           | `rgba(255,255,255,.04)` | `rgba(0,0,0,.04)`     |
| `bgActive`         | `--bg-active`         | pressed-state overlay         | `rgba(255,255,255,.08)` | `rgba(0,0,0,.08)`     |
| `bgSelected`       | `--bg-selected`       | selected row / item           | `rgba(255,255,255,.12)` | `rgba(0,0,0,.12)`     |
| `bgScrim`          | `--bg-scrim`          | modal backdrop                | `rgba(0,0,0,.55)`       | `rgba(0,0,0,.4)`      |

Example: `<div style={{ background: 'var(--bg-elevated)' }} />`.

## Foreground

The semantic ladder is `strong → default → muted → subtle`. Pick by emphasis, not by colour.

| Token         | CSS var          | Role                            | Dark                    | Light                 |
| ------------- | ---------------- | ------------------------------- | ----------------------- | --------------------- |
| `fgStrong`    | `--fg-strong`    | headings, key numerals          | `rgba(255,255,255,.94)` | `rgba(0,0,0,.92)`     |
| `fgDefault`   | `--fg-default`   | body text                       | `rgba(255,255,255,.82)` | `rgba(0,0,0,.80)`     |
| `fgMuted`     | `--fg-muted`     | captions, secondary labels      | `rgba(255,255,255,.52)` | `rgba(0,0,0,.55)`     |
| `fgSubtle`    | `--fg-subtle`    | placeholders, timestamps        | `rgba(255,255,255,.32)` | `rgba(0,0,0,.40)`     |
| `fgOnAccent`  | `--fg-on-accent` | text on top of an accent fill   | `#020207`               | `#ffffff`             |
| `fgLink`      | `--fg-link`      | hyperlink / link affordance     | `#7aa7d4`               | `#3a72b8`             |
| `fgAccent`    | `--fg-accent`    | primary brand accent (text)     | `#8aa3b8`               | `#4a6075`             |

Example: `className="text-[color:var(--fg-muted)]"`.

## Borders

| Token           | CSS var            | Role                   | Dark                    | Light                 |
| --------------- | ------------------ | ---------------------- | ----------------------- | --------------------- |
| `borderDefault` | `--border-default` | hairline               | `rgba(255,255,255,.08)` | `rgba(0,0,0,.10)`     |
| `borderMuted`   | `--border-muted`   | extra-quiet hairline   | `rgba(255,255,255,.04)` | `rgba(0,0,0,.05)`     |
| `borderStrong`  | `--border-strong`  | hover/emphasized edge  | `rgba(255,255,255,.14)` | `rgba(0,0,0,.18)`     |
| `borderFocus`   | `--border-focus`   | focus-ring colour      | `rgba(122,167,212,.55)` | `rgba(58,114,184,.55)`|

Focus rings: use `box-shadow: 0 0 0 2px var(--border-focus)`. The `focus.ring` helper in `components.ts` returns exactly this.

## Intent

Each intent has the triple `bg / fg / vivid`. `bg` is a tinted fill (≈10% alpha), `fg` is text on that fill, `vivid` is the saturated emphasis colour for icons/markers.

| Intent    | `--intent-*-fg`        | `--intent-*-bg`              | `--intent-*-vivid`     |
| --------- | ---------------------- | ---------------------------- | ---------------------- |
| success   | green-400 / green-700  | green tint @ 10%             | green-500 / `#1a7f37`  |
| warn      | amber-300 / amber-600  | amber tint @ 10%             | amber-400 / `#9a6700`  |
| danger    | red-300 / red-500      | red tint @ 10%               | red-400 / `#a83a3f`    |
| info      | blue-300 / blue-600    | blue tint @ 10%              | (no vivid — use `fg`)  |
| neutral   | grey-400 / grey-600    | white/black @ 5%             | (no vivid)             |

Example pattern — toast / banner:
```tsx
<div style={{
  background: 'var(--intent-warn-bg)',
  color: 'var(--intent-warn-fg)',
  borderColor: 'var(--intent-warn-vivid)',
}} />
```

## Identity / Intensity

Identity is the four-hue file-state palette (Spec §11). Intensity is the heat ramp.

| Token                  | CSS var                  | Role                               |
| ---------------------- | ------------------------ | ---------------------------------- |
| `identityStable`       | `--identity-stable`      | unchanged file                     |
| `identityModified`     | `--identity-modified`    | modified file (green)              |
| `identityVulnerable`   | `--identity-vulnerable`  | risky / vulnerable file (red)      |
| `identityOutOfScope`   | `--identity-out-of-scope`| out-of-scope file (purple)         |
| `intensityWarm`        | `--intensity-warm`       | hotspot / blast / risk (red ramp)  |
| `intensityCool`        | `--intensity-cool`       | stale / unimportant (blue ramp)    |
| `intensityNeutral`     | `--intensity-neutral`    | flat / no-signal grey              |

Inside SVG strokes/fills it's fine to consume these via `stroke="var(--identity-modified)"`.

## Spacing / radius / type

Theme-agnostic primitives. Always prefer the scale over arbitrary px values.

```
--space-0 / --space-0-5 / --space-1 / --space-1-5 / --space-2 / --space-3
--space-4 / --space-5 / --space-6 / --space-8 / --space-10 / --space-12

--radius-none / -xs / -sm / -md / -lg / -xl / -2xl / -3xl / -pill

--fs-2xs (9) / -xs (10) / -sm (11) / -base (12) / -md (13)
--fs-lg (14) / -xl (16) / -2xl (18) / -3xl (22) / -4xl (28)

--fw-regular / -medium / -semibold / -bold / -black

--track-tight / -normal / -wide / -wider / -widest / -eyebrow
```

`--track-eyebrow` (0.18em) is the **only** tracking value for eyebrow / micro-caps text. Don't invent another.

## Motion

```
--duration-instant (0ms) / -fast (120ms) / -base (180ms) / -slow (260ms) / -slower (380ms)
--ease-out / --ease-inOut / --ease-spring
```

Use `transition: opacity var(--duration-base) var(--ease-out)` instead of `transition-all duration-200`.

## Component tokens

```
--card-padding / --card-padding-compact / --card-radius / --card-gap
--chip-padding / --chip-radius
--pill-padding / --pill-padding-compact / --pill-radius
--panel-width  / --panel-inset
--header-height / --header-padding-x
--tab-indicator-h
--dropdown-width
--glass-blur / --glass-fill-alpha-dark / --glass-fill-alpha-light
```

## Glass utilities

`.glass-dark` and `.glass-light` (in `src/index.css`) are CSS classes — not tokens — because they bundle multiple properties (background + border + `backdrop-filter` + radius) under a single class. The `<GlassCard>` primitive in `src/shared/ui/GlassCard.tsx` picks the right one off the `isDark` prop.

If you need a glass surface in a hand-rolled component, prefer `<GlassCard>` over re-implementing the rule.

---

## Decision tree

> **"I need to colour text"** —
> headings / hi-emphasis → `var(--fg-strong)`
> body → `var(--fg-default)`
> captions, labels, secondary → `var(--fg-muted)`
> placeholders, timestamps, disabled → `var(--fg-subtle)`
> on top of an accent fill → `var(--fg-on-accent)`
> NEVER use `text-white/N` or `text-black/N` directly. The codebase has been swept clean of those — don't reintroduce them.

> **"I need a surface"** —
> page background → `var(--bg-canvas)`
> card / panel → `var(--bg-surface)`
> nested fill (subtle stripe under a card) → `var(--bg-surface-muted)`
> sticky chrome / floating top bar → `var(--bg-overlay)`
> popover, dropdown, menu, modal body → `var(--bg-elevated)`
> hover on any of the above → overlay `var(--bg-hover)`
> pressed state → overlay `var(--bg-active)`
> selected row → `var(--bg-selected)`
> modal backdrop → `var(--bg-scrim)`

> **"I need a border"** —
> default hairline → `var(--border-default)`
> lighter, "hint" hairline → `var(--border-muted)`
> hover or emphasised edge → `var(--border-strong)`
> focus ring → `box-shadow: 0 0 0 2px var(--border-focus)`

> **"I need to signal status"** —
> pick `success / warn / danger / info / neutral`, then choose `bg`, `fg`, or `vivid` from that family. Never mix families (no "red text on green bg").

> **"I need a file-state colour"** — `--identity-*`. For heat-only ramps that aren't tied to a file (blast radius, churn density), use `--intensity-*`.

> **"I need spacing / a radius / a font size"** — use the scale. `--space-3`, `--radius-lg`, `--fs-sm`. If you find yourself wanting a value that isn't in the scale, that's a sign it doesn't belong.

---

## Anti-patterns

Never:

- `isDark ? 'text-white/80' : 'text-black/80'` — use `text-[color:var(--fg-default)]`. The semantic tier already swaps for the active theme. The codebase has been swept clean of these ternaries — don't reintroduce.
- `borderLeft: '2px solid {color}'` or `<div className="absolute left-0 top-0 bottom-0 w-[2px] bg-..." />` — **left-edge accent stripes are forbidden** in this project. Differentiate list rows with foreground colour, weight, or icon — not a coloured stripe down the side. The sidebar nav active indicator is the single allowed exception.
- Hard-coded hex literals in chrome (`bg-[#0d1117]`, `text-[#5fa86c]`, `border-[#212529]`). Use the matching token. Severity hex inside SVG `stroke=` / `fill=` (`#c25a55` etc.) is acceptable when the token name would obscure intent.
- `bg-white/15 text-white` as an ad-hoc strong active state. Use `var(--bg-selected)` (or `var(--bg-active)` for pressed) plus the `fg-strong` foreground.
- Half-pixel font sizes (`text-[10.5px]`) — pick the nearest `--fs-*`.
- Inventing a new `tracking-[0.2em]` for an eyebrow — `--track-eyebrow` is the canonical value.
- Reaching into `primitives.ts` directly from feature code. Always go through the semantic tier (or the CSS var). Primitives are private to `semantic.ts` / `components.ts` / the live token editor.

---

## Tailwind interop

Every primitive lands as a CSS variable, so Tailwind arbitrary syntax can consume tokens directly:

```tsx
<span className="text-[var(--fs-sm)] font-[var(--fw-medium)] tracking-[var(--track-eyebrow)] text-[color:var(--fg-muted)]" />
<div  className="bg-[var(--bg-surface)] p-[var(--space-3)] rounded-[var(--radius-md)]" />
```

For `text-` + a CSS-var colour, the `[color:var(...)]` form is required — Tailwind otherwise treats the var as a font-size.
