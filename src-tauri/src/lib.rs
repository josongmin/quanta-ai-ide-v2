//! Application entry point for the Tauri shell.
//!
//! Layered analogous to the FSD frontend:
//!   `core`     — domain types and pure logic (no Tauri dependency)
//!   `commands` — IPC adapters; thin wrappers over `core`
//!   `menu`     — native menu construction
//!   `error`    — unified error surface across the IPC boundary

mod commands;
mod core;
mod error;
mod menu;
#[cfg(target_os = "macos")]
mod macos;

pub use error::{AppError, AppResult};

pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            commands::system::app_version,
            commands::system::ping,
        ])
        .setup(|app| {
            // Native menu (mainly to give macOS its required app menu so
            // Cmd+Q/Cmd+W/Services work with the overlay titlebar).
            let handle = app.handle();
            let menu = menu::build(handle)?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                menu::handle_event(app, event.id().as_ref());
            });

            #[cfg(target_os = "macos")]
            macos::apply_optimizations(handle);

            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(e) = result {
        eprintln!("error while running tauri application: {e}");
        std::process::exit(1);
    }
}
