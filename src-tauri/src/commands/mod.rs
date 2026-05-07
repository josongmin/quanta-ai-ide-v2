// IPC adapter layer. Each submodule groups a cohesive set of #[tauri::command]
// handlers. Keep handlers thin: validate input, delegate to `core`, map errors.

pub mod system;
