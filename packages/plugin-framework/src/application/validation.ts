import type { PluginCandidate, PluginManifest, PluginPermissionAuthorizer } from '../contracts/plugin.js';
import { PluginError } from '../errors/plugin-error.js';

const semver = /^\d+\.\d+\.\d+$/u;
export class PluginManifestValidator {
  public constructor(private readonly platformVersion: string) {}
  public async validate(candidate: PluginCandidate, authorizer: PluginPermissionAuthorizer): Promise<PluginCandidate> {
    const manifest = candidate.manifest;
    for (const value of [manifest.id, manifest.name, manifest.publisher, candidate.location, candidate.integrity]) if (value.trim() === '') throw new PluginError('PLUGIN_INVALID_MANIFEST', 'Manifest text fields are required');
    if (!semver.test(manifest.version)) throw new PluginError('PLUGIN_INVALID_MANIFEST', 'Plugin version must be semantic');
    if (!manifest.supportedPlatformVersions.includes(this.platformVersion)) throw new PluginError('PLUGIN_INCOMPATIBLE', `${manifest.id} does not support ${this.platformVersion}`);
    if (new Set(manifest.contributions.map((item) => `${item.kind}:${item.id}`)).size !== manifest.contributions.length) throw new PluginError('PLUGIN_INVALID_MANIFEST', 'Contribution identities must be unique');
    const decision = await authorizer.authorize(manifest.id, manifest.requiredPermissions);
    if (!decision.authorized) throw new PluginError('PLUGIN_PERMISSION_DENIED', decision.reason ?? 'Plugin permissions denied');
    return freezeCandidate(candidate);
  }
}

function freezeCandidate(candidate: PluginCandidate): PluginCandidate {
  const manifest: PluginManifest = { ...candidate.manifest, supportedPlatformVersions: Object.freeze([...candidate.manifest.supportedPlatformVersions]), dependencies: Object.freeze(candidate.manifest.dependencies.map((item) => Object.freeze({ ...item, versions: Object.freeze([...item.versions]) }))), requiredPermissions: Object.freeze([...candidate.manifest.requiredPermissions]), contributions: Object.freeze(candidate.manifest.contributions.map((item) => Object.freeze({ ...item, metadata: Object.freeze({ ...item.metadata }) }))) };
  return Object.freeze({ ...candidate, manifest: Object.freeze(manifest) });
}
