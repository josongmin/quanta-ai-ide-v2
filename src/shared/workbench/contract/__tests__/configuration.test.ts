import { describe, it, expect } from 'vitest';
import {
  SETTING_PRECEDENCE,
  admitSettingContribution,
  resolveConfiguration,
  migrateSetting,
  type SettingContribution,
  type SettingLayers,
} from '../configuration';

function setting(overrides: Partial<SettingContribution> = {}): SettingContribution {
  return { key: 'acme.opt', scope: 'user', type: 'string', default: null, restricted: false, secret: false, ...overrides };
}

describe('admitSettingContribution', () => {
  it('accepts a plain trusted contribution', () => {
    expect(admitSettingContribution(setting(), 'trusted').ok).toBe(true);
  });

  it('rejects a default-scope contribution from a non-core owner', () => {
    const r = admitSettingContribution(setting({ scope: 'default' }), 'trusted');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'scope-not-allowed')).toBe(true);
  });

  it('rejects a restricted setting from an untrusted owner', () => {
    const r = admitSettingContribution(setting({ restricted: true }), 'untrusted');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'untrusted-contribution')).toBe(true);
  });

  it('rejects a secret setting carrying a plaintext default', () => {
    const r = admitSettingContribution(setting({ secret: true, default: 'hunter2' }), 'trusted');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'secret-plaintext')).toBe(true);
  });

  it('accepts a secret setting with a null default', () => {
    expect(admitSettingContribution(setting({ secret: true, default: null }), 'trusted').ok).toBe(true);
  });
});

describe('resolveConfiguration precedence', () => {
  it('orders default < user < workspace < folder', () => {
    expect(SETTING_PRECEDENCE).toEqual(['default', 'user', 'workspace', 'folder']);
  });

  it('picks the highest-precedence defined layer for every combination', () => {
    // remove from the top down; the resolved scope should follow precedence
    const order: (keyof SettingLayers)[] = ['folder', 'workspace', 'user', 'default'];
    let remaining: SettingLayers = { default: 'd', user: 'u', workspace: 'w', folder: 'f' };
    for (const scope of order) {
      const resolved = resolveConfiguration(remaining);
      expect(resolved?.scope).toBe(scope);
      const { [scope]: _drop, ...rest } = remaining;
      remaining = rest;
    }
    expect(resolveConfiguration(remaining)).toBeNull();
  });

  it('treats an explicit null as defined (explicit clear)', () => {
    const resolved = resolveConfiguration({ user: null });
    expect(resolved).toEqual({ scope: 'user', value: null });
  });
});

describe('migrateSetting', () => {
  it('passes a known key through', () => {
    const r = migrateSetting(new Set(['acme.opt']), 'acme.opt', 1);
    expect(r.status).toBe('ok');
  });

  it('returns a typed unknown-setting result for a deleted key', () => {
    const r = migrateSetting(new Set(['acme.opt']), 'acme.gone', 1);
    expect(r.status).toBe('unknown');
    if (r.status === 'unknown') expect(r.error.reason).toBe('unknown-setting');
  });
});
