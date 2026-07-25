// Configuration + secret contract (WB-107).
//
// Declarative setting contributions, deterministic precedence
// (default < user < workspace < folder), and a secret-by-reference policy.
// The kernel implements the registry/service/port; this package fixes the
// contract and the admission rules.
import type { z } from 'zod';
import type { settingSchema, settingScopeSchema, DeepReadonly, JsonValue } from './schemas';
import type { Trust } from './scope';
import { type Result, type WorkbenchError, ok, err, fail } from './errors';

export type SettingContribution = DeepReadonly<z.infer<typeof settingSchema>>;
export type SettingScope = z.infer<typeof settingScopeSchema>;

// Lowest to highest precedence. A later scope overrides an earlier one.
export const SETTING_PRECEDENCE: readonly SettingScope[] = ['default', 'user', 'workspace', 'folder'];

// ── admission ───────────────────────────────────────────────────────────────
// - only built-in (core) owners may contribute host-owned `default`-scope settings
// - untrusted owners may not contribute `restricted` settings
// - secret settings must not carry a plaintext default (secret-by-reference only)
export function admitSettingContribution(setting: SettingContribution, ownerTrust: Trust): Result<SettingContribution> {
  const errors: WorkbenchError[] = [];

  if (setting.scope === 'default' && ownerTrust !== 'core') {
    errors.push(
      fail('scope-not-allowed', `only core owners may contribute default-scope settings`, {
        path: setting.key,
        detail: { trust: ownerTrust },
      }),
    );
  }
  if (setting.restricted && ownerTrust === 'untrusted') {
    errors.push(
      fail('untrusted-contribution', `untrusted owner cannot contribute restricted setting ${setting.key}`, {
        path: setting.key,
      }),
    );
  }
  if (setting.secret && setting.default !== null) {
    errors.push(
      fail('secret-plaintext', `secret setting ${setting.key} must not carry a plaintext default`, {
        path: setting.key,
      }),
    );
  }

  return errors.length > 0 ? err(errors) : ok(setting);
}

// ── precedence resolution (pure, deterministic) ──────────────────────────────
export type SettingLayers = Partial<Readonly<Record<SettingScope, JsonValue>>>;
export type ResolvedSetting = { readonly scope: SettingScope; readonly value: JsonValue };

// Returns the highest-precedence layer that defines a value. A layer set to
// `null` still counts as "defined" (explicit clear); absence of the key does not.
export function resolveConfiguration(layers: SettingLayers): ResolvedSetting | null {
  for (let i = SETTING_PRECEDENCE.length - 1; i >= 0; i -= 1) {
    const scope = SETTING_PRECEDENCE[i];
    if (Object.prototype.hasOwnProperty.call(layers, scope)) {
      return { scope, value: layers[scope] as JsonValue };
    }
  }
  return null;
}

// ── migration ────────────────────────────────────────────────────────────────
export type SettingMigration =
  | { readonly status: 'ok'; readonly key: string; readonly value: JsonValue }
  | { readonly status: 'unknown'; readonly error: WorkbenchError };

// Unknown/deleted settings produce a typed result, never a silent drop.
export function migrateSetting(knownKeys: ReadonlySet<string>, key: string, value: JsonValue): SettingMigration {
  if (!knownKeys.has(key)) {
    return { status: 'unknown', error: fail('unknown-setting', `unknown or deleted setting ${key}`, { path: key }) };
  }
  return { status: 'ok', key, value };
}

// ── ports (kernel-implemented) ───────────────────────────────────────────────
// Secrets are referenced by opaque handle; plaintext never enters a manifest or
// serialized configuration.
export type SecretRef = string;
export type SecretStoragePort = {
  get(ref: SecretRef): Promise<string | null>;
  set(ref: SecretRef, value: string): Promise<void>;
  delete(ref: SecretRef): Promise<void>;
};

export type ConfigurationRegistry = {
  register(setting: SettingContribution, ownerTrust: Trust): Result<SettingContribution>;
  get(key: string): SettingContribution | undefined;
};

export type ConfigurationService = {
  resolve(key: string, layers: SettingLayers): ResolvedSetting | null;
};
