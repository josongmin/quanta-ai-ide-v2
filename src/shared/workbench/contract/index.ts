// Public boundary of the workbench contract (WB-104).
//
// Consumers import from here (or `@shared/workbench`), never from internal
// modules. The fail-new `deepImport` audit rule enforces this.

// errors / results
export type { WorkbenchError, WorkbenchErrorReason, Result, Ok, Err } from './errors';
export { ok, err, fail } from './errors';

// schema SoT (types + serialization + JSON Schema)
export type { JsonValue, DeepReadonly, WhenExpr } from './schemas';
export {
  CURRENT_MANIFEST_SCHEMA_VERSION,
  assertJsonSafe,
  manifestJsonSchema,
  ownerOf,
} from './schemas';

// manifest
export type { FeatureManifest, ManifestSet, HostCapability, InstalledOwner } from './featureManifest';
export { parseFeatureManifest, validateManifestSet, checkHostCompatibility } from './featureManifest';

// surface
export type { Group, Surface, LayoutPreset } from './surface';

// command
export type { CommandContribution, CommandResult } from './command';

// scope
export type { OwnerRef, ScopeIdentity, ScopeKind, ScopeLifecycle, Trust } from './scope';

// context
export type { ContextKind, ContextEnvelope, ContextReceiver, Sensitivity, Durability } from './context';
export { checkContextCompatibility } from './context';

// configuration / secrets
export type {
  SettingContribution,
  SettingScope,
  SettingLayers,
  ResolvedSetting,
  SettingMigration,
  SecretRef,
  SecretStoragePort,
  ConfigurationRegistry,
  ConfigurationService,
} from './configuration';
export { SETTING_PRECEDENCE, admitSettingContribution, resolveConfiguration, migrateSetting } from './configuration';
