import type { AuthorizationDecision, PlatformEvent } from '@agentprodready/foundation';

export type ContributionKind = 'capability' | 'provider' | 'tool' | 'workflow-node' | 'configuration' | 'event-subscription';
export interface PluginDependency { readonly pluginId: string; readonly optional: boolean; readonly versions: readonly string[]; }
export interface PluginContribution { readonly kind: ContributionKind; readonly id: string; readonly version: string; readonly metadata: Readonly<Record<string, unknown>>; }
export interface PluginManifest {
  readonly id: string; readonly name: string; readonly version: string; readonly publisher: string;
  readonly supportedPlatformVersions: readonly string[]; readonly dependencies: readonly PluginDependency[];
  readonly requiredPermissions: readonly string[]; readonly contributions: readonly PluginContribution[];
}
export interface PluginCandidate { readonly manifest: PluginManifest; readonly location: string; readonly integrity: string; }
export type PluginState = 'discovered' | 'validated' | 'registered' | 'activating' | 'active' | 'deactivating' | 'inactive' | 'failed';
export interface PluginRecord { readonly candidate: PluginCandidate; readonly state: PluginState; readonly failure?: string; }
export interface PluginDiscoverySource { discover(): Promise<readonly PluginCandidate[]>; }
export interface PluginContributionRegistry { readonly kind: ContributionKind; register(pluginId: string, contribution: PluginContribution): void; remove(pluginId: string): void; list(): readonly PluginContribution[]; }
export interface PluginPermissionAuthorizer { authorize(pluginId: string, permissions: readonly string[]): Promise<AuthorizationDecision>; }
/** Bootstrap owner: Blueprint 03 Composition. */
export interface ImplementationActivator { activate<T>(pluginId: string, contributionId: string): Promise<T>; }
export interface PluginLifecycleHook { activate(): Promise<void>; deactivate(): Promise<void>; }
export interface PluginHookResolver { resolve(pluginId: string): PluginLifecycleHook | undefined; }
export interface PluginLifecycleEventPayload { readonly pluginId: string; readonly pluginVersion: string; readonly state: PluginState; }
export type PluginLifecycleEvent = PlatformEvent<PluginLifecycleEventPayload>;
