# UI runtime and Tauri capability boundary

## Trust boundary

- The `main` WebView is trusted application code. It receives only core window operations required by the custom title bar.
- Renderer code does not receive direct shell, native dialog, or OS plugin permissions.
- Native operations must enter through typed Rust commands with validated inputs and reason-coded errors.
- A future extension, preview, or auxiliary WebView must use a separate window label and a separate capability file. It must not inherit `default.json` by convention.

## UI ownership

- Persistent workbench parts are owned by the tab/workbench layout authority.
- Transient layers are owned by `LayerManager` and carry `UiOwnerRef` identity.
- Scope disposal closes owned dialogs/layers with `scope-disposed`; hidden tabs are not admitted to keybinding dispatch.
- `CommandService` is the sole new keybinding admission path. Existing direct listeners are frozen in `tools/ui-infra-ledger.json` and may only decrease.

## Test-only native automation

- The WebdriverIO native rail uses the external `tauri-driver` provider on Linux CI.
- No WebDriver plugin or permission is shipped in the application capability set.
- Embedded WebDriver support, if later required for macOS, must be debug-feature-gated and use a test-only capability file.

## Admission checks

Any new native command or window must provide:

1. owning Rust module and typed input/output contract;
2. exact window label and least-privilege capability;
3. workspace-trust behavior and secret handling;
4. negative tests for unauthorized window and invalid input;
5. renderer and native E2E receipts where the boundary is user-visible.

## Agent-bridge WebSocket egress (CSP `connect-src`)

The chat feature dials the quanta agent daemon over a WebSocket. Egress is
constrained at two layers, and the two are kept in lockstep by tests
(`src/shared/agent-bridge/__tests__/csp.test.ts`, `config.test.ts`):

- **Network layer (CSP `connect-src`, `src-tauri/tauri.conf.json`)** — allows
  only the loopback dev daemon: `ws://127.0.0.1:4096`, `ws://localhost:4096`,
  `ws://[::1]:4096`. A bare `wss:` scheme-source is **deliberately not shipped**:
  it would authorize WebSocket egress to *any* host, i.e. a token/chat exfil
  channel for a compromised dependency or XSS. Fail-closed until a real prod
  daemon exists.
- **App layer (`config.ts`)** — resolution order is injected → deeplink → env →
  dev-default. Only the **untrusted deeplink** (`?ws=…&token=…`) is gated by
  `isAllowedWsUrl`, which permits **loopback `ws://` only** — a deeplink may not
  retarget the socket + token at a remote host (ws or wss). The trusted
  env/injected paths may set a remote host but bypass this gate by design.

**Adding a production daemon** therefore requires TWO pinned changes, not a wildcard:
1. add the daemon's exact origin to `connect-src` (e.g. `wss://daemon.example`),
   ideally interpolated from a build-time var rather than hardcoded; and
2. widen `isAllowedWsUrl` **only if** deeplinks to that pinned host are wanted
   (they usually are not — prefer env/injected).

A runtime receipt (`e2e/renderer/csp-websocket.spec.ts`) asserts the CSP permits
the loopback socket and blocks a remote host, so a future CSP edit that reopens
wildcard egress fails CI.
