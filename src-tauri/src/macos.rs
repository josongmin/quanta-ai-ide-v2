//! macOS-only runtime tweaks. Everything in here is best-effort: failures are
//! logged and swallowed so a hostile or unusual macOS environment can't take
//! the app down at launch. Each tweak is gated by a `cfg(target_os = "macos")`
//! at the call site and the module itself is only compiled on macOS.

use tauri::{AppHandle, Manager, Runtime};

/// Apply macOS-specific optimisations once the app is set up. Order matters
/// only loosely — none of these depend on each other, but App Nap must be
/// disabled before the first long idle window to take effect on this launch.
pub fn apply_optimizations<R: Runtime>(app: &AppHandle<R>) {
    disable_app_nap();

    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = configure_main_window(&window) {
            eprintln!("[macos] window tweaks failed: {e}");
        }
    }
}

/// Tell `NSProcessInfo` to keep the app out of App Nap while it's running.
///
/// **Why:** App Nap throttles CPU and timer resolution for apps the OS thinks
/// are idle (occluded windows, no recent input). For a three.js / canvas app
/// that wants to keep its render loop steady even when the user is mousing
/// around another window, App Nap can drop the effective frame rate to 1–10 Hz
/// and produce visible stutter when the user comes back. The cost is a small
/// amount of background CPU; we accept that for predictable rendering.
///
/// We hold the activity token for the lifetime of the process by leaking it
/// — it's a single `id` (~8 bytes) and there's no clean drop point that
/// outlives the Tauri runtime anyway.
fn disable_app_nap() {
    use objc2::{class, msg_send, runtime::AnyObject};
    use objc2_foundation::NSString;

    // SAFETY: we send well-formed selectors to `NSProcessInfo` whose
    // signatures are stable since 10.9. The returned activity token is
    // retained by `beginActivityWithOptions:` per Apple's contract; we
    // intentionally never release it (process-lifetime hold).
    unsafe {
        let pi: *mut AnyObject = msg_send![class!(NSProcessInfo), processInfo];
        if pi.is_null() {
            return;
        }
        // NSActivityUserInitiated | NSActivityLatencyCritical
        //   = 0x00FFFFFF | 0xFF00000000
        // — the public bitmask Apple uses in <Foundation/NSProcessInfo.h>.
        let options: u64 = 0x00FF_FFFF | 0xFF_0000_0000;
        let reason = NSString::from_str("Steady render loop for 2.5D city");
        let _token: *mut AnyObject = msg_send![
            pi,
            beginActivityWithOptions: options,
            reason: &*reason,
        ];
        // Token deliberately leaked — see fn comment.
    }
}

/// Force the webview's content view to be layer-backed and opaque. Tauri/wry
/// already does this on recent versions, but on some macOS combinations the
/// initial paint flickers if the layer is set up lazily on the first compositing
/// pass. Setting it explicitly is idempotent and cheap.
fn configure_main_window<R: Runtime>(window: &tauri::WebviewWindow<R>) -> tauri::Result<()> {
    use objc2::{msg_send, runtime::AnyObject};

    let ns_window = window.ns_window()? as *mut AnyObject;
    if ns_window.is_null() {
        return Ok(());
    }

    // SAFETY: `NSWindow.contentView` and `NSView.setWantsLayer:` /
    // `setLayerContentsPlacement:` are stable AppKit APIs since 10.5 / 10.6.
    unsafe {
        let content_view: *mut AnyObject = msg_send![ns_window, contentView];
        if !content_view.is_null() {
            let _: () = msg_send![content_view, setWantsLayer: true];
            // 4 == NSViewLayerContentsPlacementScaleAxesIndependently — keeps
            // the canvas crisp during live resize without extra repaints.
            let _: () = msg_send![content_view, setLayerContentsPlacement: 4i64];
        }

        // Opt the window out of automatic tabbing (Cmd+T grouping). The app
        // is single-window; tabbing just clutters the Window menu.
        // 2 == NSWindowTabbingModeDisallowed.
        let _: () = msg_send![ns_window, setTabbingMode: 2i64];
    }

    Ok(())
}
