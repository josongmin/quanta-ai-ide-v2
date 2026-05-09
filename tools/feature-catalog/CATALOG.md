# Feature Catalog

_141 features across 19 families._

## Tier distribution

| Tier | Count |
|---|---|
| 🔵 leading | 78 |
| 🟢 parity | 59 |
| 🟡 progressive | 2 |
| ⚪ table-stakes | 2 |

## Composer

_The input surface — text, voice, slash, mention, model picker, history, stop. Every prompt the user sends passes through this funnel._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `composer-ime-safe` | 🟢 parity | **IME-safe input (Korean / Japanese / Chinese)** — Enter while a CJK composition is in flight no longer submits the draft. Composer guards on `e.nativeEvent.isComposing` plus a mirrored `composing` state from compositionstart/end events. | Web platform `compositionstart`/`compositionend` events |
| `composer-mention-file` | 🟢 parity | **`#` file mention picker** — Type `#` to open a fuzzy-matched file picker. Substring beats subsequence beats nothing. Captures keyboard nav while open and inserts the picked path inline. | GitHub PR `@`-mention picker |
| `composer-mention-symbol` | 🟢 parity | **`@` symbol mention picker** — Same UX as `#`-file but scoped to symbol names (functions, classes, types). Shares the picker component; only the candidate set differs. | Cursor `@symbol` |
| `composer-resize` | 🟢 parity | **ChatAgent vertical resize** — Top-edge grip handle on the bottom-anchored ChatAgent widget. Drag to grow (deltaY inverted because we're anchored to viewport bottom), double-click to reset, Home/Esc to reset, ↑↓ to nudge ±24px. Persists in localStorage `chat-agent:height`. | macOS Finder column separator + VS Code panel grip |
| `composer-slash-commands` | 🟢 parity | **Slash commands** — `/plan`, `/diff <ref>`, `/test`, `/fix`, `/explain`, `/review`, `/clean`. Pops a list above the composer when input starts with `/`. ↑↓ navigate, Tab/Enter pick, Esc clears. | Slack / Linear command bar |
| `model-picker-turn-level` | 🟢 parity | **Model picker with turn-level recording** — Composer model state lifts to the parent so every `AgentTurn` records `turn.model`. Critical for cost attribution and side-by-side comparison. | Cursor model dropdown |
| `per-project-default-model` | 🔵 leading | **Per-project default model + saved override** — Each project carries a `defaultModel`. On task switch the lifted model state mirrors that default *unless* the user has set a per-project override in localStorage. The model dropdown footer surfaces a "Save as project default" action. | VS Code workspace settings |
| `prompt-history` | 🔵 leading | **Prompt history (↑↓ shell-style)** — Per-task localStorage of the last 50 prompts, dupe-suppressed. ↑ on the first line of an empty/clean composer recalls the previous prompt; ↓ walks back forward and finally restores the saved draft. Typing exits history. | bash / zsh / Python REPL |
| `stop-heat` | 🔵 leading | **Stop button heat (neutral → amber → rose)** — The Stop button changes tone with elapsed stream time. 0–5s neutral, 5–15s amber, 15s+ rose. Resets every time streaming starts. | Car dashboard warning escalation |
| `stop-press-and-hold` | 🔵 leading | **Press-and-hold stop with progress ring** — During the first 5 seconds Stop is a normal click. After 5s the heat escalates to amber, after 15s rose; both heat tiers require a 400ms hold. A circular SVG progress ring fills as the user holds, releasing early aborts. Keyboard activation (Enter/Space) always triggers an immediate stop for accessibility. | Vercel "press to cancel" deploy |
| `voice-interim` | 🔵 leading | **Voice input + interim ghost text** — Web Speech API with `continuous: true, interimResults: true`. Final transcripts commit to the draft; interim renders as italic ghost overlay above the textarea so the user can correct mid-sentence without waiting for the pause. | Whisper UI / Granola |

## Secret & PII Guard

_Composer-time DLP. Scans drafts for high-entropy tokens before they leave the device, blocks critical matches, and redacts on PR export._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `secret-mask-modal` | 🔵 leading | **Mask-and-send modal** — On critical match the composer pops a modal floating just above the textarea, listing each detected secret with its first 4 chars + an ellipsis. Three actions: Mask & send (safe default, autofocus), Send as-is (warn-tier only), Cancel. Esc cancels, Enter masks. | 1Password autofill confirm |
| `secret-pattern-scan` | 🔵 leading | **Pattern + entropy secret scan** — GitHub Secret Scanning's published pattern set (OpenAI, Anthropic, AWS, GitHub PAT, JWT) plus PII (email, US SSN, credit-card). High-entropy regexes use a Shannon-entropy gate so plain English doesn't false-positive. | GitHub Secret Scanning + Trufflehog entropy gate |
| `secret-redact-replace` | 🔵 leading | **Deterministic placeholder replacement** — `redactText` walks the matches in source order and replaces each value with `[REDACTED:<kind>]`, returning the new string plus a parallel list of placeholders carrying the original for one-shot reveal. The kind suffix keeps the agent's reasoning stable ("the user gave me a token here") without leaking the value. | Bitwarden one-shot reveal |
| `secret-three-tier` | 🔵 leading | **3-tier severity (critical / warn / info)** — Critical matches block submit and demand mask-or-cancel. Warn matches surface a soft modal that allows send-as-is once. Info is silent — log only. Mirrors Slack DLP's three-tier escalation. | Slack DLP banner + 1Password vault paste warning |

## Cost & Budget

_Cumulative spend tracking, per-turn forecast, and 3-tier enforcement (alert / soft-cap / hard-cap) with auto-downgrade fallback._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `budget-pulse-animation` | 🔵 leading | **Heart-rate pulse on alert tier** — `coding-cost-alert` pulses the cost chip at 800ms (≈75 bpm). `coding-cost-hard` pulses at 600ms once we cross softCap. Borrows the heart-rate metaphor so the eye reads it as "this is alive and asking for your attention" rather than "alarm, alarm". | Apple Watch breathing app + heart-rate pulse |
| `budget-soft-cap-modal` | 🔵 leading | **Soft-cap modal (auto-downgrade / override / stop)** — On soft-cap crossing the user sees three big actions, ordered by safety. Auto-downgrade picks the next-cheaper model and re-submits automatically. Override raises the cap on this task only. Stop is the no-op safe choice. | ATM overdraft warning |
| `budget-three-tier` | 🔵 leading | **3-tier budget (alert / soft-cap / hard-cap)** — `CostBudget.{alertUsd, softCapUsd, hardCapUsd}` per project. Crossing `alertUsd` flips the meter amber and pulses at heart-rate (~75 bpm). Crossing `softCapUsd` blocks the next submit and pops a 3-choice modal. Crossing `hardCapUsd` lets the in-flight turn finish (so we don't waste paid-for tokens) but blocks any further submission. | AWS Budgets + Kubernetes ResourceQuota |
| `cost-forecast` | 🔵 leading | **Streaming-time next-turn forecast** — While a turn streams, the meter appends "+~$X.XX to next turn" projecting the running average forward. Lets the user decide *during* the stream whether to stop instead of after. | SRE error-budget burn rate |
| `cost-meter` | 🟡 progressive | **Cumulative cost meter (tokens + USD)** — Header-level rollup. Sums in/out tokens across every agent turn, prices each by the turn's recorded model against the static `MODEL_PRICING` map, and renders the total as `tok · ~$X.XX`. | AWS Cost Explorer header |
| `cost-projection` | 🔵 leading | **Per-turn average projection** — Running mean of cost-per-turn surfaces alongside the cumulative number so the user can sanity-check whether the next turn will fit the budget. | SRE error-budget rate |

## Trust & Observability

_Calibration UI for "should the user trust this output". Citations, staleness, self-eval confidence, latency profile, drift detection, tool/model success rate._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `citation-staleness` | 🔵 leading | **Citation staleness detection** — `annotatedThread` walks every turn after each citation; if a later turn edits the cited file, the citation gains `staleAfterTurn` and renders with an amber `[stale]` chip + line-through on the file basename. | Cache invalidation marker (HTTP `Vary` / GraphQL fragments) |
| `citations` | 🟡 progressive | **Per-turn citations** — Each `AgentTurn` carries a `citations[]` array — `{ path, lines, note }` — rendered as compact chips under the turn header. Hover reveals full path + author note. Click jumps to the file (planned). | Cody / Phind source attribution |
| `drift-detection` | 🔵 leading | **Anomaly drift detector (stuck / noisy)** — Compares the latest agent turn's thinking-ratio and tool-call count against the running mean across earlier turns. ≥2× either triggers `stuck` (amber) or `noisy` (amber). Surfaces in ContextRail. | SRE 3-sigma alerts adapted for small-N |
| `latency-baseline` | 🔵 leading | **Latency baseline comparison (vs task average)** — For each turn with phase data, the `LatencyBar` compares this turn's weighted total against the task's running average. ±15% prints "match", faster prints emerald `0.7× faster`, slower prints amber `2.3× slower`. | SRE p50/p99 alert thresholds |
| `latency-profile` | 🔵 leading | **Latency profile (per-phase stacked bar)** — Once a turn finishes, `phaseDurationsMs` renders as a 6px stacked bar coloured by phase. Hover any segment for `<phase> · <ms>ms (<pct>%)`. Total ms shown to the right. | Chrome DevTools waterfall / Linkerd latency dashboard |
| `per-turn-confidence` | 🔵 leading | **Self-eval confidence chip** — `AgentTurn.confidence` (0..1). Header chip with three tones: ≥85% high (subtle emerald), 60–85% mid (neutral), <60% low (amber + "review me"). Optional `confidenceRationale` lands in the tooltip. | Anthropic extended-thinking calibration |
| `phase-label` | 🟢 parity | **Phase label during streaming** — `AgentTurn.phase` enum (thinking / reading / searching / editing / running / planning / writing) drives a small chip in the streaming state pill so the user can see *what* the agent is doing, not just *that* it's doing something. | Devin "doing X" footer |
| `tool-success-rate` | 🔵 leading | **Per-tool / per-model success rate** — `useMemo` walks the active task's thread, counts tool blocks by `status === 'ok'` divided by total. Bucketed by tool kind and by the originating turn's model. ContextRail panel renders as horizontal bars with tones at 80% / 50% thresholds. | Agent-eval literature (METR / OpenAI evals) |
| `tps-live` | 🔵 leading | **TPS live meter (tok/s during streaming)** — Estimates tokens-per-second from blocks-emitted-so-far against a hand-tuned token-per-block table, ticking once a second. Renders as a chip beside the phase label; the icon pulses at the same cadence as the meter so the meaning ("this is live") reads instantly. | Whisper UI live-tokens / Granola stream meter |

## Recovery & Time-travel

_Non-destructive history navigation. Inverse-op recovery (instead of destructive rewind), branch-from-here forks, batch checkpoint operations, scrubber preview._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `branch-from-turn` | 🔵 leading | **Branch from turn (fork the task)** — "Branch from here" clones the task up to the chosen turn into a new sibling task. The new task carries `parentTaskId` + `branchedFromTurn` so the relationship survives reload. Sidebar renders branched tasks with a small fork glyph next to the title. | Git branching / Linear sub-issues |
| `inverse-op-recovery` | 🔵 leading | **Inverse-op append (non-destructive rewind)** — `applyInverseOf(turn)` synthesizes a compensating `AgentTurn` — edits become reverse-edits, runs become noted "skipped", citations are dropped — and appends it instead of dropping future turns. The full audit trail survives. | Database WAL / event sourcing |
| `timeline-scrubber` | 🔵 leading | **Timeline scrubber (turn-level time travel)** — Horizontal scrubber under the thread renders one tick per turn, coloured by phase. Click a tick to "preview" — the thread renders up to that turn with later turns dimmed. Click again or press Esc to exit preview. Keyboard ←→ steps, Home/End jumps to ends. | Figma version history / Final Cut timeline |
| `turn-menu-recover` | 🟢 parity | **Per-turn menu (rewind / branch / copy)** — Each `AgentTurn` header carries a context menu (right-click or `⋯`): Copy text, Copy as Markdown, Share, Export, Export as PR, Open in new task. Menu is keyboard-navigable, Esc closes, focus restores. | GitHub commit dropdown |
| `working-tree-drift` | 🔵 leading | **Working-tree drift markers (clean / shifted / overlap / gone)** — `FileDrift` carries the 3-way-merge result between the recorded edit and the on-disk file. Each hunk gets a status: clean (still applies), shifted (applies at new line numbers), overlap (conflicting edit in the way), gone (file removed). The diff panel renders an icon per status so the user sees drift before clicking apply. | RCS / git 3-way merge |

## Diff & Review

_Hunk-level accept/reject, threaded review comments, side-by-side toggle, working-tree drift detection, test ↔ hunk failure mapping, inline line edit, inline-AI-rewrite affordances._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `diff-conflict-overlay` | 🔵 leading | **Conflict overlay on overlapping hunks** — When `reconcileHunks` reports an `overlap` status, the diff row expands to show the user's local change inline beside the agent's proposed change, with a `Use mine / Use theirs / Merge manually` triplet. | VS Code merge editor / git mergetool |
| `hunk-level-apply` | 🟢 parity | **Per-hunk apply / reject** — Each hunk in the diff panel carries Apply / Reject buttons; applied hunks get a green check, rejected hunks fade. Bulk Apply All / Reject All in the panel header. | GitHub PR file-tree apply / IntelliJ partial commit |
| `review-comments-inline` | 🔵 leading | **Inline review comments per hunk** — Each hunk carries an optional `comments` array (`HunkComment`). Click the `+` in the hunk gutter to attach a note; notes survive reload and travel with the hunk if it shifts. Notes render in the PR description as `> file:line — note`. | GitHub line comments / Gerrit drafts |
| `side-by-side-diff` | 🟢 parity | **Side-by-side diff (with intra-line highlights)** — Two-column diff renderer. Word-level highlights inside changed lines use a Myers diff over the line content so the eye lands on the actual change, not the whole line. | GitHub split view / Beyond Compare |
| `test-hunk-mapping` | 🔵 leading | **Test ↔ hunk attribution scoring** — `attributeTestsToHunks` scores each (test, hunk) pair on stack-hit (does the failing stack mention the hunk's file/lines?) plus coverage-overlap (does the test cover the changed lines?). Top 3 suspects render under each failing test. | Bisect-style fault localization (Tarantula / Ochiai) |

## Task & Project Management

_The left rail — multi-task fleet view. Concurrent streams, drag-drop reorder, status shape encoding, background-task ribbon, MCP integrations._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `background-tasks` | 🔵 leading | **Background streaming with notification badge** — Switching tasks while one is mid-stream keeps that task running in the background. The sidebar entry surfaces a cloud chip + ribbon while streaming; on completion a badge counter appears until the user opens the task. | macOS app dock badges / Slack unread |
| `per-task-budget` | 🔵 leading | **Per-task budget independent of project budget** — `task.budget` overlays project-level `CostBudget` for one-off expensive runs. Sidebar entry shows a slim budget bar coloured by fraction-spent; hover for the absolute number. | AWS account-level vs service-level budgets |
| `task-archive` | 🟢 parity | **Archive completed tasks (with restore)** — Completed tasks fade from the sidebar after 7 idle days but stay in an Archive section accessible from the sidebar footer. Restore moves them back to the active list. (Spec only — implementation pending.) | Gmail Archive / Linear "completed" |
| `task-rename-inline` | 🟢 parity | **Inline task rename (auto-suggested from first prompt)** — New tasks default to "Task N" but auto-suggest a 5-word title extracted from the first prompt. Sidebar entry is double-clickable to rename inline; Enter commits, Esc cancels. | Linear ticket auto-title / ChatGPT thread name |
| `task-sidebar` | 🟢 parity | **Multi-task sidebar with quick switch** — Left rail lists every task with title, last-active timestamp, and a status glyph (running / idle / failed / done). Click switches the main thread; ⌘K opens a fuzzy task switcher. | VS Code activity bar / Linear inbox |

## PR / CI / Branch

_GitHub-side state synced into the IDE. Branch ahead/behind/mergeable, PR status, reviewers, CI checks._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `branch-name-suggest` | 🟢 parity | **Auto branch-name suggestion from task title** — Branch name field defaults to a kebab-cased version of the task title, prefixed with the user's preferred convention (`feat/`, `fix/`, `chore/` — picked up from recent branch history). | Linear branch-name copy / git-flow conventions |
| `ci-failure-attribution` | 🔵 leading | **CI failure → suspect-hunk routing** — On a red check, the `attributeTestsToHunks` pipeline runs against the failing test names and routes the user back to the most likely hunk. The hunk row pulses amber until acknowledged. | Sentry suspect-commit / spec-hint |
| `pr-checks-inline` | 🔵 leading | **PR checks status inline** — Once a PR is open, the task header shows live CI status — green/red dots per check, click for the failing log. Polls the `gh` CLI every 30s; cancels polling when the PR is merged or closed. | GitHub PR checks UI |
| `pr-description-export` | 🟢 parity | **Export thread as PR description (Markdown)** — `turnToPrDescription` walks the active task's thread and emits a structured Markdown summary: bullet of changes, citations grouped by file, test results, cost. One click copies to clipboard. | Conventional Commits / GitHub PR template |

## Plan & Workflow

_Plan blocks with checkable items, confidence + cost estimates per step, auto-advance, /diff preview, snapshot card._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `plan-block` | 🟢 parity | **Agent-authored plan blocks** — `PlanBlock` is a structured list of `PlanItem` steps with status (pending / done / skipped / failed). Renders as a checkbox list that updates in place as the agent works through the plan. | Devin "plan" panel / GitHub Issues task lists |
| `plan-edit-inline` | 🔵 leading | **User-editable plan steps** — Each plan step has a hover `Edit` action — the user can rewrite, reorder (↑↓ buttons), or delete steps before approving. Approving locks the plan and starts execution. | Notion checklist / Asana task ordering |
| `plan-progress-meter` | 🟢 parity | **Plan progress meter (steps done / total)** — Header shows `n/m steps` with a thin progress bar. ETA is computed from `phaseDurationsMs` averaged across completed steps. | GitHub Actions progress / npm install spinner |
| `plan-skip-with-reason` | 🔵 leading | **Skip step with logged reason** — Skipping a step opens a tiny prompt asking *why* (one-liner). The reason rides along in the audit log so reviewers later understand deviations from the original plan. | Postmortem deviation log / SOP variance reports |

## A11y & Micro-UX

_Accessibility (high-contrast, density toggle, skip-link, reduced-motion) plus the science-backed micro-animations (heart-rate pulses, DAW hatch, MS-Word wavy underline)._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `density-toggle` | 🔵 leading | **Density toggle (comfortable / compact)** — Settings exposes a density toggle that swaps the spacing scale by ratio. Persists in localStorage; affects the whole shell. | Gmail density / Slack compact mode |
| `keyboard-shortcut-overlay` | 🟢 parity | **Keyboard shortcut overlay (?)** — Pressing `?` outside of an input pops a modal listing every keyboard shortcut grouped by area. Esc closes; focus restores to the trigger. | GitHub `?` shortcut help / Linear command palette |
| `locale-sync-audit` | 🔵 leading | **i18n key parity audit (ko/en/ja/zh)** — `scripts/i18n-audit.mjs` walks every namespace under `locales/` and fails the build if any locale is missing a key from the source locale. CI gate. | i18next-parser / Lokalise QA |
| `prefers-contrast-aware` | 🔵 leading | **`prefers-contrast` aware tokens** — All semantic tokens carry a `more` variant that swaps background luminance and bumps text contrast to ≥ 7:1. CSS picks via `@media (prefers-contrast: more)`. | WCAG 2.2 AAA contrast / macOS Increase Contrast |
| `prefers-reduced-motion` | 🟢 parity | **`prefers-reduced-motion` aware** — All transitions, pulses, and animations gate on a media query — motion-sensitive users get instant state changes instead of fades and slides. | WCAG 2.3.3 Animation from Interactions |
| `skip-to-composer` | 🟢 parity | **Skip-to-composer link** — First Tab focusable on the page is a "Skip to composer" link that jumps focus to the textarea. Standard for any page with a long scrollable content region preceding the input. | WCAG 2.4.1 Bypass Blocks |

## UX System

_Cross-cutting affordances — command palette, context menu, reactions, snapshot card, prompt history, resizable widget._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `blueprint-surface` | 🔵 leading | **Blueprint surface utility (mode-aware bg)** — `blueprintSurface(mode, depth)` returns the right glass / solid / outlined background for the active universe mode. Single source of truth for surface treatments — no `bg-zinc-900/50` literals scattered across components. | Material Design surface elevation / Apple HIG materials |
| `button-tone-system` | 🟢 parity | **Button tone system (primary / secondary / ghost / danger)** — `<Button tone>` covers four tones with consistent hover / focus / active states. Disabled state respects contrast minimums; danger tone is reserved for irreversible actions. | Material 3 button hierarchy / shadcn/ui |
| `click-outside-hook` | ⚪ table-stakes | **useClickOutside (popover / menu dismiss)** — Hook that calls a handler when a pointerdown lands outside the referenced element. Powers menu dismissal, popover close, and mention-picker collapse. | react-onclickoutside / DOM pointerdown convention |
| `confidence-meter` | 🔵 leading | **ConfidenceMeter (calibrated 0..1 bar)** — Reusable 0..1 bar with three colour zones — ≥0.85 emerald, 0.6–0.85 neutral, <0.6 amber. Used by per-turn confidence chip, rule reliability cards, and admission overview. | Anthropic extended-thinking calibration thresholds |
| `deterministic-rng` | 🟢 parity | **Seeded RNG (deterministic demo data)** — `makeRng(seed)` wraps a deterministic LCG so demo fixtures are reproducible across reloads. Used by SAMPLE_PROJECTS, sample tasks, and timeline jitter. | numpy.random.default_rng / mulberry32 |
| `dialog-a11y-hook` | 🔵 leading | **useDialogA11y (focus trap + restore)** — Single hook that owns dialog accessibility — focus trap, focus restore on close, Esc-to-close, aria-modal wiring. Modal / Drawer / Popover all consume it. | WAI-ARIA dialog pattern |
| `drawer-popover-modal-stack` | 🟢 parity | **Layered overlay primitives (Drawer / Popover / Modal)** — Three overlay primitives with disjoint use cases — Modal for blocking decisions, Drawer for side-anchored long content, Popover for transient hover-attached info. Each owns its own focus-trap + Esc-handling. | WAI-ARIA dialog / Radix UI primitives |
| `glass-card` | 🟢 parity | **GlassCard component (mode-aware glass)** — `<GlassCard>` wraps the blueprint surface + a thin border + the standard inner radius. Used for every floating panel — overlay popover, modal bodies, the timeline panel — so the visual language stays consistent. | Apple frosted-glass materials / Linear panels |
| `resize-handle` | 🟢 parity | **ResizeHandle (Fitts-correct rail/panel grip)** — Reusable resize grip — 3px visual rule with 8px hit zone, drag to resize, double-click to reset, keyboard ←→/↑↓ to nudge. Used by TaskRail, ChatAgent, Composer, PrTicketRail. | macOS Finder column separator + Fitts' law |
| `section-component` | 🟢 parity | **Section component (titled, collapsible region)** — `<Section title=...>` standardises the titled block — title row, optional collapse, consistent vertical rhythm. Used in settings, rules board, inspect panels. | macOS System Settings sections |
| `shortcut-registry` | 🟢 parity | **useShortcut (keyboard registry hook)** — Component-scoped keyboard shortcut registration. Each `Shortcut` declares keys + scope (input vs global) so the input-aware handlers don't fire while typing. | react-hotkeys / VS Code keybinding scopes |
| `stacked-ratio-bar` | 🟢 parity | **StackedRatioBar (segmented proportions)** — Horizontal bar split into N coloured segments. Used for accept/revise/reject mixes, latency-by-phase, success-rate breakdowns. Hover any segment for percentage + label. | D3 stacked bar / Datadog "request mix" widget |
| `token-primitives` | 🔵 leading | **Token primitives (semantic, not literal)** — All colours route through `--surface-base`, `--text-primary`, `--accent-emphasis` etc. — never raw hex. Mode and contrast overrides resolve at the CSS variable layer. | Style Dictionary / Tailwind theme() |

## Command Palette & Reactions

_⌘K palette + ⋯ context menu + reactions + LiveSnapshotCard + drag-reorder. The cross-feature affordances that bind the thread together._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `command-palette` | 🟢 parity | **⌘K command palette** — `CommandPalette` opens on ⌘K (capture-phase so it wins over the chat-agent's ⌘K). Fuzzy-search across `PaletteAction[]` — new task, switch model, jump to project, open shortcuts — with keyboard nav, hint chips, and a deterministic insertion point. | VS Code command palette / Linear ⌘K |
| `live-snapshot-card` | 🔵 leading | **Live snapshot card (post-task summary)** — `LiveSnapshotCard` renders a one-glance summary of the active task's state: cost, turns, last action, "Continue" CTA. Sized to read without scrolling. Shows even when the thread has scrolled away. | GitHub PR summary card / Linear issue header |
| `mention-caret-detection` | 🟢 parity | **Caret-anchored mention detection** — `findMentionAtCaret` scans the textarea backwards from the caret looking for a `#` or `@` trigger un-broken by whitespace. Returns `{ trigger, query, start, end }` so the picker can replace exactly the active mention without disturbing the rest of the draft. | Slack / GitHub @mention parser |
| `task-drag-reorder` | 🔵 leading | **Drag-reorder tasks within project** — `TaskRail` rows are HTML5-draggable. Dragging within the same project shows an "insert here" indicator on dragOver and reorders on drop. Cross-project drag is intentionally blocked — ordering is a per-project concern. | Trello card drag / Linear sub-issue reorder |
| `task-rail-resize` | 🟢 parity | **TaskRail width resize** — The left task rail has a draggable separator on its right edge. `TASK_RAIL_MIN_WIDTH` / `TASK_RAIL_MAX_WIDTH` clamp the range; width persists in localStorage. | VS Code activity bar resize |
| `turn-reactions` | 🔵 leading | **Per-turn reactions (👍 👎 ❤️ 🎯)** — Each agent turn carries an optional `reactions` map. Toggling sets one key true; toggling the same key clears it. Mutual exclusion enforced when switching reactions. Used downstream for RLHF-style quality signal aggregation. | Slack message reactions / RLHF preference labels |
| `turn-status-classification` | 🔵 leading | **Turn status / cost / risk classification helpers** — `timelineMeta.ts` exposes `turnMeta`, `approxCost`, and `classifyInverse` — the pure functions the scrubber and turn-menu use to pick colours, render cost chips, and decide whether a rewind is `safe / risky / noop`. | Functional core / imperative shell |

## Inspect & Visualize

_Dependency / risk visualizations: ChordDiagram, CycleGraph, DependencyMatrix, EdgeBundlingMap, SunburstHierarchy, Treemap, RiskHeatmap, LayeredBoxDiagram, FocusScanStack with safe-rename and symbol time-machine._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `chord-diagram` | 🔵 leading | **ChordDiagram (module ↔ module flows)** — Circular layout with chord ribbons sized by import-edge weight. Hover a chord to dim non-incident chords; click to pin. | D3 chord diagrams / Sankey |
| `cycle-graph` | 🔵 leading | **CycleGraph (find import cycles)** — Renders strongly-connected components in the import graph. Each SCC > 1 highlights as a cycle the user should break. | Tarjan SCC / madge --circular |
| `dependency-matrix` | 🟢 parity | **DependencyMatrix (DSM)** — Square matrix of modules × modules with cell shading by dependency density. Reveals layering — a near-triangular matrix means clean layering, off-triangle entries are leaks. | Lattix DSM / IntelliJ DSM view |
| `deps-carousel` | 🔵 leading | **DepsCarousel (dependency story strip)** — Horizontal strip of "story slides" walking the user through a file's outbound and inbound dependencies one at a time. ←→ to page; each slide focuses on one neighbour. | Instagram stories / Granola scroll cards |
| `edge-bundling-map` | 🔵 leading | **EdgeBundlingMap (hierarchical edge bundling)** — Hierarchical edge bundling around a circular dendrogram. Module structure on the rim, dependency edges bundled through the centre. | Holten 2006 hierarchical edge bundling |
| `focus-scan-stack` | 🔵 leading | **FocusScanStack (multi-pane focus view)** — Stacks AI-context, blast-radius, index-state, refactor-actions, safe-rename, semantic-conflict, similar-symbols, and the SymbolTimeMachine into a single scroll surface — the agent-IDE answer to "what does this symbol touch?" | Sourcegraph code intel + JetBrains "Find Usages" |
| `inspect-panel` | 🟢 parity | **Inspect panel (multi-tab visualizer host)** — `InspectPanel` is the right-side host for the inspect-target feature. Hosts a tab strip and lazy-loads the chosen visualization (chord, cycle, matrix, edge-bundling, sunburst, treemap, layered, risk heatmap). | VS Code panels / IntelliJ tool windows |
| `layered-box-diagram` | 🔵 leading | **LayeredBoxDiagram (architecture layers)** — Renders the project's architecture-layer rules as stacked boxes with allowed-import arrows. Violations highlight in amber. | ArchUnit / Structurizr C4 model |
| `risk-heatmap` | 🔵 leading | **RiskHeatmap (file × risk-axis)** — Two-dimensional heatmap: rows are files, columns are risk axes (churn, complexity, blast radius, coverage gap). Shaded by score. | SonarQube hotspots view / Code Climate |
| `sunburst-hierarchy` | 🟢 parity | **SunburstHierarchy (radial folder hierarchy)** — Radial hierarchy with concentric rings = depth, arc width = LOC. Click a slice to zoom in. | D3 sunburst / WizMap |
| `symbol-time-machine` | 🔵 leading | **SymbolTimeMachine (per-symbol git history)** — Walks the per-symbol commit history (not file history) — useful when a symbol moved between files. Renders as a vertical timeline with diff snippets. | git log -L:fn:file / JetBrains "Show History for Selection" |
| `treemap` | 🟢 parity | **Treemap (rectangular folder hierarchy)** — Squarified treemap with area = LOC and shading by churn. Click to drill in. | Bruls et al. 2000 squarified treemap |

## Admission Rules & Calibration

_Statistical guard for letting agent-authored changes through — calibration curves, CUSUM drift, survival curves, counterfactual impact. The "how much do we trust this rule" surface._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `admission-workspace` | 🟢 parity | **Admission workspace (top-level)** — `AdmissionWorkspace` is the host for the rule lifecycle UI — Overview / Decision / History / RulesBoard / RuleEditor tabs. | Feature-flag platforms (LaunchDarkly / GrowthBook) |
| `anomaly-sentinel` | 🔵 leading | **AnomalySentinel (z-score outlier surfacing)** — Tracks the per-rule accept-rate's z-score against its 14-day rolling baseline. |z| > 2 flips the sentinel amber, |z| > 3 red. | SRE 3-sigma alerts / Z-score outlier detection |
| `confidence-band` | 🟢 parity | **ConfidenceBand (CI ribbon overlay)** — Shaded ±95% confidence ribbon around any time-series chart in the admission v2 surface (CUSUM, survival, reliability). | ggplot2 geom_ribbon / Pyplot fill_between |
| `confidence-mix` | 🔵 leading | **ConfidenceMix (rule confidence breakdown)** — Stacked bar of rule confidence by decision class — accept / revise / reject — so a reviewer can see whether the model is confident-correct or confident-wrong. | Calibration histogram (Brier score viz) |
| `cost-badge` | 🟢 parity | **CostBadge (per-rule cost overlay)** — Tiny chip on each rule card showing rolling cost ($/day) so expensive rules surface for review without opening the row. | AWS cost-by-tag chips |
| `counterfactual-impact` | 🔵 leading | **Counterfactual impact card** — "What would have happened if this rule weren't live?" shows the agent decisions that flipped because of the rule, sized by potential blast radius. | Counterfactual reasoning in causal inference |
| `cusum-drift-card` | 🔵 leading | **CUSUM drift card (rule performance drift)** — Per-rule CUSUM (cumulative-sum control chart) of accept-rate. A sustained run above/below the centerline signals real drift, not noise. | Page 1954 CUSUM / SPC charts |
| `effect-size-bar` | 🔵 leading | **Effect-size bar (Cohen's d / log-odds)** — Reports the rule's effect on the underlying decision distribution as a Cohen's d (continuous) or log-odds (binary), with 95% CI error bars. | Cohen 1988 effect-size / Cumming "the new statistics" |
| `reliability-diagram` | 🔵 leading | **Reliability diagram (rule calibration plot)** — Predicted-confidence × empirical-accept-rate scatter, with the diagonal as perfect calibration. Bands shade ±15% drift. | DeGroot/Fienberg 1983 reliability diagram |
| `rule-editor` | 🟢 parity | **RuleEditor (declarative predicate editor)** — Condition-builder surface for the per-rule predicate. Group / AND / OR / NOT scaffolding with one input per leaf clause. | Notion filter builder / Sentry alert rules |
| `rules-board` | 🔵 leading | **RulesBoard (kanban-style rule lifecycle)** — Three columns — proposed / shadow / live — with rule cards moving between them as approvers act. Drop targets enforce valid transitions. | Kanban / Jira workflow |
| `survival-curve` | 🔵 leading | **Survival curve (rule TTL)** — Kaplan-Meier-style survival curve for rule accept-rate over time. Shows the TTL of a rule's effectiveness — when does it decay? | Kaplan-Meier survival analysis |

## Filter & Search

_Faceted filtering (preset / range / metric), folder tree navigator, search-DSL bar. The way users narrow the workspace to what they care about._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `facet-renderer` | 🟢 parity | **FacetRenderer (declarative facet host)** — Single component that picks the right facet type (preset / range / metric / category) from the facet's declared shape. New facet types register here; consumers stay generic. | react-jsonschema-form / Material-UI generics |
| `filter-bar` | 🟢 parity | **FilterBar (faceted filter host)** — `FilterBar` is the top of the filter feature — composes preset, range, and metric facets, plus a folder-tree opener. Keyboard navigable; Esc collapses any open facet. | Linear filter chips / Notion property filters |
| `folder-tree-nav` | 🟢 parity | **FolderTree (workspace navigator)** — Imperative-handle-exposing folder tree. `FolderTreeHandle` lets consumers expand to a path, scroll-to-file, or trigger filter changes. | VS Code explorer / IntelliJ project view |
| `preset-facet` | 🟢 parity | **PresetFacet (saved filter presets)** — Dropdown of saved filter presets — "my open PRs", "high-risk files", "untested code paths". Selecting a preset replaces the active facet stack atomically. | Linear views / GitHub Issues filters |
| `project-selector` | 🟢 parity | **Project selector (filter scope)** — Multi-select dropdown that scopes every other filter to a chosen project set. Persists via FilterContext so the choice survives navigation. | GitHub repo scope selector / Linear team picker |
| `range-facet` | 🟢 parity | **RangeFacet (numeric range filter)** — Two-handle slider for numeric facets — LOC, churn, age-in-days. Live-updates the result count as the user drags. | Airbnb price slider / Steam refine sliders |
| `search-dsl-bar` | 🔵 leading | **Search DSL bar (typed search syntax)** — Top search bar parses a small DSL — `is:open path:src/ author:me age:<7d` — into structured query terms. Tokens render as removable chips; raw text stays as fallback fuzzy search. | GitHub search syntax / JIRA JQL |

## PR Review surface

_DiffView with unified/split toggle, inline comment threads, reply/resolve, action bar, conversation log, PR preview bar and change list._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `avatar-component` | ⚪ table-stakes | **Avatar (login → display)** — Tiny `Avatar` component that takes a login + size and renders the GitHub avatar with a fallback to initials. Used everywhere a person is referenced. | GitHub user avatars / Gravatar |
| `conversation-log` | 🔵 leading | **ConversationLog (timeline of review events)** — Chronological mix of comments, reviews, status checks, force-pushes. Each event is one row; clicking expands the row to the full body inline. | GitHub PR conversation tab / Linear activity log |
| `diff-view` | 🟢 parity | **DiffView (unified / split toggle)** — `DiffView` is the host for diff rendering. Mode toggle switches between unified and split via `ModeToggle`. Renders one `DiffHunk` per hunk. | GitHub PR diff viewer / Gerrit |
| `inline-comment-composer` | 🟢 parity | **Inline comment composer** — Click `+` on a diff line to open `InlineCommentComposer` directly in the gutter. Cmd+Enter submits; Esc cancels and restores focus. | GitHub PR review composer |
| `inline-thread` | 🔵 leading | **Inline review thread (per-line conversation)** — `InlineThread` renders a comment thread inline in the diff at the line it was anchored to. Replies stack under the original; resolve collapses the thread to a single chip. | GitHub line-comment threads / Gerrit replies |
| `pr-preview-trigger` | 🟢 parity | **PR preview trigger (open the bar)** — Header button that opens the `PrPreviewBar` — the sticky bottom bar showing the active branch's PR diff summary, checks, and conflicts. | VS Code GitHub Pull Requests extension |
| `review-action-bar` | 🟢 parity | **Review action bar (approve / request-changes / comment)** — Sticky bottom bar with the three GitHub-canonical review actions. Approve / Request changes both require a non-empty top-level comment for traceability. | GitHub PR review summary |

## Mode switching & Activity

_DotField vs Universe view modes, AI activity overlay / tray / feed, and the lazy mode registry that swaps the whole app surface._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `ai-activity-control` | 🔵 leading | **ActivityControlPanel (operation throttle / kill)** — Modal exposing per-operation controls: pause stream, switch model on the fly, abort. Mirrors what a power user would do at the API level but inline. | htop / Activity Monitor process controls |
| `ai-activity-overlay` | 🔵 leading | **AI activity overlay (mode-scoped status)** — `ActivityOverlay` floats over the active mode showing in-flight agent operations (calls, tools, streams). Position adapts per mode — bottom-right in DotField, head-up display in Universe. | Linear sync indicator / VS Code status bar |
| `ai-activity-tray` | 🟢 parity | **ActivityTray (recent operations log)** — A bottom-edge tray that expands to show the last N agent operations with timestamps, durations, and statuses. Click any row to open the `AgentFeedPanel` filtered to that operation. | Vercel deploys panel / GitHub Actions runs |
| `dotfield-mode` | 🔵 leading | **DotField mode (data-density view)** — Particle-grid view of the workspace where every dot is a file coloured by churn / risk / coverage. The "what is the system doing right now" surface. | Bret Victor "Up and Down the Ladder of Abstraction" |
| `mode-registry` | 🔵 leading | **Lazy mode registry** — `createMode(id)` lazy-imports the mode bundle on first switch — DotField and Universe each load only when the user picks them. Keeps the initial bundle thin while supporting multiple full-app surfaces. | React.lazy / dynamic import |
| `universe-mode` | 🔵 leading | **Universe mode (3D dependency space)** — Three.js scene placing modules as nodes in a force-directed 3D layout. Camera-controllable; selecting a node opens the inspect panel scoped to that module. | Gephi 3D layouts / Code City |
| `view-mode-context` | 🟢 parity | **ViewModeContext (mode-aware components)** — Context provider that exposes the active `ViewMode` so deep components can swap surface treatment, particle colour, or micro-animation without prop-drilling. | React Context (theme-style) |

## App shell & Cross-cutting context

_Top-level Stage host, AppShell, GitActionsMenu, OverlayContext and PrefsContext providers, and the review-stage rails._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `app-shell` | 🟢 parity | **AppShell (chrome host)** — Top-level layout — title bar, navigation, mode-switcher slot, chat-agent slot. Wraps every page and owns the keyboard shortcut registry. | VS Code shell / Linear app shell |
| `engine-findings-rail` | 🔵 leading | **EngineFindingsRail (CI / scanner findings)** — Right-side rail in review stage showing findings from CI, semgrep, lint, type, test runs — grouped by severity, click to jump to the offending hunk. | GitHub PR checks / Sourcegraph code intel |
| `git-actions-menu` | 🟢 parity | **GitActionsMenu (branch-scoped quick actions)** — Branch-anchored menu surfacing Pull / Push / Sync / Rebase / Discard with confirmation gates on the destructive entries. | GitHub Desktop branch menu |
| `heat-overlay-picker` | 🔵 leading | **HeatOverlayPicker (heat-metric chooser)** — Picker exposing the heat-metric axes — churn, complexity, blast radius, coverage gap, recent edits, cost, latency. Active metric drives the colour ramp on every viz. | Chrome DevTools "Rendering" pane / Datadog metric picker |
| `overlay-context` | 🔵 leading | **OverlayContext (heat / risk / time overlay state)** — Provider for the overlay popover's three axes — heat metric, risk lens, time window. One context, three pickers, every visualization reads from here. | VS Code workbench layout state |
| `pr-context-rail` | 🟢 parity | **PrContextRail (PR-level context)** — Left rail in review stage showing PR-level metadata — author, branch, base, linked issues, reviewers, status checks summary. | GitHub PR sidebar |
| `pr-ticket-rail` | 🔵 leading | **PrTicketRail (PR list scoped to me / team)** — Resizable rail listing PRs in scope (`mine-to-review` / `my-prs` / `team`) sortable by risk / updated / size. Persists width, scope, and sort key. | GitHub Pulls inbox / Linear inbox |
| `prefs-context` | 🟢 parity | **PrefsContext (cross-feature preferences)** — React context for user preferences (density, locale, theme, motion). One provider serves the whole app and persists to localStorage on each change. | React Context + localStorage |
| `risk-lens-switcher` | 🔵 leading | **RiskLensSwitcher (risk-axis cycler)** — One-tap cycler through risk lenses (no-coverage, high-blast, recent-failures, churn-spike). The "what would hurt most if it breaks" lens. | Photography lens cycle (50mm / 35mm / 85mm) |
| `settings-panel` | 🟢 parity | **SettingsPanel (top-level prefs UI)** — Density, theme, motion, locale, model-defaults — all live in `SettingsPanel`. Compact mode for embedding inside other surfaces. | macOS System Settings sections |
| `shortcuts-modal` | 🟢 parity | **ShortcutsModal (?-triggered cheat sheet)** — Modal listing every keyboard shortcut grouped by feature. Triggered by `?` outside an input. | GitHub `?` shortcut help |
| `stage-host` | 🟢 parity | **Stage (top-level page host)** — `Stage` is the central content host beneath `AppShell`. Routes feature pages and provides the safe-area insets used by the chat-agent overlay. | SwiftUI NavigationStack |
| `time-window-picker` | 🟢 parity | **TimeWindowPicker (rolling window)** — Picker for the time window applied to every metric — 24h, 7d, 30d, 90d, all-time. Affects churn, recent-failures, cost aggregation. | Datadog/Grafana time-range picker |

## Chat agent (bottom-anchored)

_The bottom-pinned ChatAgent widget — proactive suggestions, tokens panel, vertical resize. Lives at app level, not coding-stage level._

| ID | Tier | Feature | Pattern |
|---|---|---|---|
| `chat-agent-resize` | 🔵 leading | **ChatAgent vertical resize (top-grip handle)** — 3px visual rule with an 8px hit zone on the chat-agent's top edge. Drag to grow, double-click / Esc / Home to reset, ↑↓ to nudge ±24px. Persists in localStorage `chat-agent:height`. | macOS Finder column separator + Fitts' law |
| `chat-agent-widget` | 🔵 leading | **ChatAgent (bottom-pinned conversational widget)** — App-level chat surface anchored to the viewport bottom. Lives independently of the active page so the conversation persists across navigation. Carries the model picker, vertical resize, voice input, and slash commands. | Intercom messenger / Slack thread launcher |
| `proactive-suggestions` | 🔵 leading | **Proactive suggestions (low-safety / unknown-flag / refactor / blast-radius)** — `useRunSuggestion(key)` runs a typed suggestion against the current context. Four built-in keys cover the most common proactive nudges — flagging low-safety actions, unknown feature flags, refactor opportunities, and blast-radius warnings. | Intercom Operator / GitHub Copilot inline hints |
| `tokens-panel` | 🔵 leading | **TokensPanel (live cost + tokens drawer)** — Slide-up drawer from the chat-agent showing live in/out token counts, cost, and breakdown by model. Closeable; reopen from the chat-agent footer. | Browser DevTools "Network" panel |

