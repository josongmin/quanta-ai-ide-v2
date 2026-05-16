import net from 'node:net';
import { spawn } from 'node:child_process';

const DEFAULT_PORT = 5173;
const PROBE_HOSTS = ['127.0.0.1', 'localhost'];

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (ok) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(750, () => finish(false));
  });
}

async function hasRunningDevServer(port) {
  for (const host of PROBE_HOSTS) {
    if (await canConnect(host, port)) return true;
  }
  return false;
}

const port = Number(process.env.TAURI_DEV_PORT ?? DEFAULT_PORT);

if (await hasRunningDevServer(port)) {
  console.log(`[tauri] reusing existing Vite dev server on :${port}`);
  process.exit(0);
}

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const child = spawn(command, ['dev'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
