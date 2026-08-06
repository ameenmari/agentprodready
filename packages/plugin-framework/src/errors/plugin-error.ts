export type PluginErrorCode = 'PLUGIN_INVALID_MANIFEST' | 'PLUGIN_DUPLICATE' | 'PLUGIN_MISSING_DEPENDENCY' | 'PLUGIN_DEPENDENCY_CYCLE' | 'PLUGIN_INCOMPATIBLE' | 'PLUGIN_PERMISSION_DENIED' | 'PLUGIN_REGISTRATION_FAILED' | 'PLUGIN_INVALID_TRANSITION' | 'PLUGIN_NOT_FOUND';
export class PluginError extends Error {
  public constructor(public readonly code: PluginErrorCode, message: string, options?: ErrorOptions) { super(message, options); this.name = 'PluginError'; }
}
