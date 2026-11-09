<p align="center"><img src="readme-banner.svg" alt="Quanta AI IDE v2 — A scoped workbench for code, agents, and software intelligence." width="100%"></p>

# Quanta AI IDE v2

<p align="center"><a href="#engineering-highlights">Engineering</a> · <a href="#architecture-at-a-glance">Architecture</a> · <a href="#run-locally">Get started</a> · <a href="#documentation">Reference</a></p>

A codebase visualization workbench for exploring repositories as spatial systems. React and TypeScript provide the interface, Three.js renders the scene, Zustand manages state, and Tauri supplies the optional desktop shell.

## Engineering highlights

| Mechanism | Engineering purpose | Source |
| :--- | :--- | :--- |
| **Registered workspace surfaces** | The app composes a surface runtime and route registry; workspace features consume that registry through context. | [Composition](src/app/App.tsx) |
| **Scoped workbench infrastructure** | Shared workbench and UI infrastructure own scope, keybindings, overlays, and cleanup concerns. | [Workbench](src/shared/workbench/) |
| **Agent integration boundary** | Agent-session integration lives behind the app and shared bridge layers, keeping the presentation surface distinct from the agent runtime. | [Agent bridge](src/shared/agent-bridge/) |
| **Architecture and UI checks** | Import-boundary audits, UI-infrastructure checks, catalog validation, renderer tests, and bundle budgets have separate scripts. | [UI audit](scripts/ui-infra-audit.mjs) |

## Architecture at a glance

```mermaid
flowchart TB
    A["App providers and router"] --> R["Surface runtime registry"]
    R --> W["Workspace tabs and workbench"]
    W --> F["Feature slices and widgets"]
    F --> S["Shared UI, state, and agent bridge"]
    S --> H["Browser or Tauri host"]
```

## What it does

- Explore files and targets through a 3D dot field and alternate visualization modes.
- Filter the workspace, inspect selected targets, and overlay code metrics.
- Compose workspace, organization, personal settings, and agent activity screens.
- Inspect components with Storybook and verify browser rendering, UI infrastructure, and bundle budgets.

## Repository map

| Path | Responsibility |
| --- | --- |
| [src/app](src/app) | Application entry and global composition. |
| [src/widgets](src/widgets) | Workbench regions and screen composition. |
| [src/features](src/features) | User actions and feature workflows. |
| [src/entities](src/entities) | Domain data and models. |
| [src/shared](src/shared) | UI, rendering, and shared workbench infrastructure. |
| [docs](docs) | Catalog, specifications, and design decisions. |

## Run locally

Use Node.js >=20 and pnpm@10.33.0. Run these commands from the repository root.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Development checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### Desktop and UI verification

```sh
pnpm tauri:dev
pnpm test:renderer
pnpm verify
```

Desktop development requires Rust and platform build dependencies. Renderer tests require a browser environment. `package.json` defines the exact verification pipeline.

## Scope and status

This repository develops the visualization and interaction surfaces. Demonstration metrics are separate from measurements produced by a connected analysis engine. Web, browser-renderer, and desktop checks cover different execution paths.

## Documentation

- [Feature catalog](docs/catalog.md)
- [Workbench handoff](docs/workbench-handoff.md)
- [Design RFCs](docs/rfc)
- [Script reference](package.json)

<p align="center"><sub><a href="https://github.com/josongmin">Project map</a> · <a href="#engineering-highlights">Back to overview</a></sub></p>
