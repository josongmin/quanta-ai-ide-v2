// Public boundary of the workbench kernel (WBT-02). Consumers reach these
// through `@shared/workbench`; nothing here bypasses the WBT-01 contract.
export { ScopeNode, type Disposable } from './ScopeNode';
export {
  ContributionRegistry,
  type RegistryEntry,
  type RegistrySnapshot,
  type RegistryObserver,
} from './ContributionRegistry';
export {
  CommandService,
  type CommandHandler,
  type CommandRegisterOptions,
  type CommandExecuteOptions,
} from './CommandService';
export { ContextKeyService, type ContextValue } from './ContextKeyService';
export {
  IntentBus,
  type Intent,
  type DeliveryMode,
  type BusLimits,
  type IntentHandler,
  type FlushResult,
} from './IntentBus';
