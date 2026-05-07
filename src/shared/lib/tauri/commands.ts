// Typed mirror of the Rust `#[tauri::command]` surface in
// `src-tauri/src/commands/`. Add a wrapper here whenever a new command lands
// on the Rust side — never let raw `invoke('...')` strings leak into features.
//
// stub, add real commands here. The current entries below are placeholders
// retained as templates; no frontend caller invokes them yet.

import { invoke } from './invoke';

export const appVersion = (): Promise<string> => invoke<string>('app_version');

export const ping = (message: string): Promise<string> =>
  invoke<string>('ping', { message });
