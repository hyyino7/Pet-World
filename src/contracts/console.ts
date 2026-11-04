import type { HealthSnapshot, ModuleId, Revision, ServiceCall } from './common.js';

export type ConfigValue = null | boolean | number | string
  | readonly ConfigValue[] | { readonly [key: string]: ConfigValue };
export interface ConfigurationView {
  module: ModuleId; revision: Revision;
  values: Readonly<Record<string, ConfigValue>>;
  secretFields: readonly string[];
}
/** Credentials are secret-store references; values and exports contain no secrets. */
export interface ConsoleService {
  getHealth: ServiceCall<Record<string, never>, readonly HealthSnapshot[]>;
  getConfiguration: ServiceCall<{ module: ModuleId }, ConfigurationView>;
  changeConfiguration: ServiceCall<{
    module: ModuleId; expectedRevision: Revision;
    patch: Readonly<Record<string, ConfigValue>>;
  }, { revision: Revision; restartRequired: boolean }>;
}
