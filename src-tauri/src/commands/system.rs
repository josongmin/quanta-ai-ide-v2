use crate::AppResult;

#[tauri::command]
pub fn app_version() -> AppResult<&'static str> {
    Ok(env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
pub fn ping(message: String) -> AppResult<String> {
    Ok(format!("pong: {message}"))
}
