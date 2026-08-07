export interface LocalReferenceConfig {
  readonly host: string;
  readonly port: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly referenceAgentEnabled: boolean;
}

export const LOCAL_TENANT = 'local-tenant';
export const LOCAL_WORKSPACE = 'local-workspace';
export const LOCAL_PROJECT = 'local-project';
export const LOCAL_USER = 'local-user';
export const LOCAL_AGENT_PRINCIPAL = 'agent-principal:reference-agent';
export const REFERENCE_AGENT_ID = 'reference-agent';
export const REFERENCE_AGENT_VERSION = '1.0.0';
export const REFERENCE_AI_ID = 'reference-ai';
export const LOCAL_POLICY_VERSION = 'local-1';
export const PRODUCT_VERSION = '0.1.0';

export function loadLocalReferenceConfig(env: NodeJS.ProcessEnv = process.env): LocalReferenceConfig {
  const port = Number.parseInt(env['PORT'] ?? '3000', 10);
  const logLevel = env['LOG_LEVEL'] ?? 'info';
  if (!Number.isFinite(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }
  if (logLevel !== 'debug' && logLevel !== 'info' && logLevel !== 'warn' && logLevel !== 'error') {
    throw new Error('LOG_LEVEL must be debug, info, warn, or error');
  }
  return {
    host: env['HOST'] ?? '127.0.0.1',
    port,
    logLevel,
    referenceAgentEnabled: (env['REFERENCE_AGENT_ENABLED'] ?? 'true') !== 'false',
  };
}
