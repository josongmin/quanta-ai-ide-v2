//! Native menu wiring. macOS gets a full menu bar (the OS *requires* one for
//! Cmd+Q / Cmd+W to behave correctly with overlay titlebars). Other platforms
//! fall back to Tauri's default menu so we don't double-render.

use tauri::{
    menu::{AboutMetadataBuilder, Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    AppHandle, Emitter, Manager, Runtime,
};

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let pkg = app.package_info();
    let about = AboutMetadataBuilder::new()
        .name(Some(pkg.name.clone()))
        .version(Some(pkg.version.to_string()))
        .copyright(Some(String::from("Copyright © 2026 se-dot-field-demo")))
        .build();

    // Custom item — the JS side listens for `menu://settings` and opens its
    // own SettingsPanel. Cmd+, is the macOS HIG default.
    let settings = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;

    let app_menu = SubmenuBuilder::new(app, &pkg.name)
        .about(Some(about))
        .separator()
        .item(&settings)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .fullscreen()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .close_window()
        .build()?;

    let menu = MenuBuilder::new(app)
        .items(&[&app_menu, &edit_menu, &view_menu, &window_menu])
        .build()?;

    Ok(menu)
}

pub fn handle_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    if id == "settings" {
        // Fan out to whichever window is currently focused.
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.emit("menu://settings", ());
        }
    }
}
