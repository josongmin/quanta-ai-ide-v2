import { useState } from 'react';

export type MfaKind = 'totp' | 'webauthn' | 'sms';
export type MfaMethod = {
  id: string;
  kind: MfaKind;
  label: string;
  added: string;
  lastUsed: string;
  primary: boolean;
};

export const INITIAL_METHODS: MfaMethod[] = [
  { id: 'm1', kind: 'totp',     label: '1Password',           added: '2025-08-14', lastUsed: '2h ago',  primary: true  },
  { id: 'm2', kind: 'webauthn', label: 'YubiKey 5C — desk',   added: '2025-09-02', lastUsed: '3d ago',  primary: false },
  { id: 'm3', kind: 'webauthn', label: 'MacBook Touch ID',    added: '2025-12-19', lastUsed: '14h ago', primary: false },
];

export type Session = {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastSeen: string;
  current: boolean;
};

export const SESSIONS: Session[] = [
  { id: 's1', device: 'MacBook Pro 14"',  browser: 'Chrome 125',  os: 'macOS 15',  location: 'Seoul, KR',     ip: '203.0.113.42',  lastSeen: 'Active now',     current: true  },
  { id: 's2', device: 'iPhone 15',         browser: 'Mobile Safari', os: 'iOS 18',  location: 'Seoul, KR',    ip: '203.0.113.51',  lastSeen: '14m ago',         current: false },
  { id: 's3', device: 'Mac mini (office)', browser: 'Arc 1.42',    os: 'macOS 14',  location: 'Seoul, KR',    ip: '198.51.100.18', lastSeen: '2h ago',          current: false },
  { id: 's4', device: 'Linux laptop',      browser: 'Firefox 128',  os: 'Ubuntu 24', location: 'Berlin, DE',  ip: '198.51.100.97', lastSeen: '6d ago',          current: false },
];

export type LogEvent = {
  id: string;
  type: 'success' | 'fail' | 'mfa' | 'reset' | 'logout';
  at: string;
  detail: string;
  ip: string;
  location: string;
};

export const HISTORY: LogEvent[] = [
  { id: 'h1', type: 'success', at: '2026-05-10 09:14', detail: 'Signed in with password',          ip: '203.0.113.42',  location: 'Seoul, KR'   },
  { id: 'h2', type: 'mfa',     at: '2026-05-10 09:14', detail: 'MFA verified · TOTP (1Password)',  ip: '203.0.113.42',  location: 'Seoul, KR'   },
  { id: 'h3', type: 'fail',    at: '2026-05-09 23:42', detail: 'Wrong password (1 of 3 strikes)', ip: '198.51.100.97', location: 'Berlin, DE'  },
  { id: 'h4', type: 'success', at: '2026-05-08 14:01', detail: 'Signed in with GitHub OAuth',     ip: '203.0.113.51',  location: 'Seoul, KR'   },
  { id: 'h5', type: 'reset',   at: '2026-02-12 11:30', detail: 'Password reset',                  ip: '203.0.113.42',  location: 'Seoul, KR'   },
  { id: 'h6', type: 'logout',  at: '2026-02-01 18:22', detail: 'Signed out (session expired)',    ip: '203.0.113.42',  location: 'Seoul, KR'   },
];

export function useGeneratedCodes(n: number): string[] {
  const [codes] = useState(() => {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: n }, () => {
      let s = '';
      for (let j = 0; j < 12; j++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
      return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
    });
  });
  return codes;
}

export function downloadCodes(codes: string[]) {
  const blob = new Blob(
    [`# se · field recovery codes\n# Generated ${new Date().toISOString()}\n\n${codes.join('\n')}\n`],
    { type: 'text/plain' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sefield-recovery-codes.txt';
  a.click();
  URL.revokeObjectURL(url);
}
