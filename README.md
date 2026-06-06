# se-dot-field-demo

A Software-Engineering / codebase visualizer demo. Renders a repository as a 3D
dot field (and other modes) so you can filter files, inspect targets, swap
visualization modes, and overlay metrics. Built with React 18 + TypeScript +
Vite, Three.js for rendering, Zustand for state, and Tauri for the desktop
shell.

## Quick start

```sh
pnpm install
pnpm dev          # web dev server
pnpm build        # type-check + production build
```

For the desktop shell:

```sh
pnpm tauri:dev    # Tauri dev (requires Rust toolchain)
pnpm tauri:build  # Tauri production installer
```

## Scripts

| Script        | What it does                                     |
| ------------- | ------------------------------------------------ |
| `dev`         | Start Vite dev server                            |
| `build`       | `tsc -b` then `vite build`                       |
| `preview`     | Preview the production build locally             |
| `typecheck`   | `tsc -b --noEmit`                                |
| `lint`        | Run ESLint over the repo                         |
| `lint:fix`    | ESLint with `--fix`                              |
| `verify`      | typecheck + lint + semgrep                       |
| `tauri:dev`   | Run the Tauri desktop shell in dev               |
| `tauri:build` | Build the Tauri desktop installer                |

A `test` script is not yet wired up; Vitest is configured and ready when tests
are added.

## Keyboard shortcuts

Bindings are wired globally via `useShortcut` (`@shared/lib`). On macOS use ⌘
in place of Ctrl. Most shortcuts are suppressed while typing in a text field.

| Action                          | Shortcut          |
| ------------------------------- | ----------------- |
| Focus search                    | `Cmd/Ctrl` + `K`  |
| Focus search (alt)              | `/`               |
| Open settings                   | `Cmd/Ctrl` + `,`  |
| Open AI activity                | `Cmd/Ctrl` + `Shift` + `A` |
| Toggle keyboard-shortcuts help  | `Cmd/Ctrl` + `/`  |
| Close dialog / clear focus      | `Esc`             |

## FSD layout

The app uses Feature-Sliced Design. Imports flow **downward only**:
`app -> widgets -> features -> entities -> shared`. A higher layer may import
from a lower layer; the reverse is forbidden (enforced via
`eslint-plugin-boundaries`).

```
src/
  app/        Composition root, providers, top-level App.tsx
  widgets/    Page-sized compositions (app-shell, stage)
  features/   User-facing capabilities (filter-files, inspect-target, ...)
  entities/   Domain models (repo, facet, metric, viz-mode)
  shared/     Cross-cutting primitives (ui, lib, tokens, theme)
```

Layer responsibilities:

- **app** - boots React, wires providers, mounts the root widget.
- **widgets** - assembles features into a screen region.
- **features** - one slice = one user capability; owns its UI, state, and lib.
- **entities** - pure domain types and helpers; no UI logic.
- **shared** - reusable building blocks with no business knowledge.

## Features

- `filter-files` - FilterBar UI for the repo filter sidebar.
- `entities/filter-state` - global Zustand filter store (`FilterProvider`, hooks).
- `shared/config/workspaceTabs` - tab route metadata (paths, labels); app composes lazy stages into `TAB_REGISTRY`.
- `inspect-target` - inspect details of a focused file or cluster.
- `switch-mode` - swap between 3D visualization modes (registry-driven).
- `apply-overlay` - overlay metrics on top of the active mode.
- `chat-agent` - in-app conversational helper.
- `tweak-prefs` - user-tunable preferences.
- `search-dsl` - DSL-based search across the repo graph.

## How to add a new feature

1. Create `src/features/<name>/` with `ui/`, `model/`, and (if needed) `lib/`.
2. Re-export the public surface from `src/features/<name>/index.ts`.
3. Compose it from a widget (or another feature one layer up). Never import
   sideways into `features/` from another `features/` slice.

## How to add a new 3D mode

Add the mode class/factory next to its peers in
`src/features/switch-mode/lib/` and register it in
[`src/features/switch-mode/lib/registry.ts`](src/features/switch-mode/lib/registry.ts).
The widget picks it up automatically.

## Tooling notes

- **Vite** is Tauri-aware (see `vite.config.ts`).
- **Zustand** stores live under each feature's `model/`.
- **ESLint** boundaries plugin enforces the FSD import direction.
- **Semgrep** rules live in `.semgrep.yml`; run with `pnpm semgrep`.

## Pre-commit hook (optional)

A lightweight shell hook lives at `.githooks/pre-commit`. Enable it per clone:

```sh
git config core.hooksPath .githooks
```

It runs `pnpm typecheck && pnpm lint` before each commit. No Node-based hook
manager is installed.

## CI

GitHub Actions runs typecheck, lint, and build on every push to `main` and on
pull requests (`.github/workflows/ci.yml`). A separate job runs
`cargo check` against the Tauri shell.
