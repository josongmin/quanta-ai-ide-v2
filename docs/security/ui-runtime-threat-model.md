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
