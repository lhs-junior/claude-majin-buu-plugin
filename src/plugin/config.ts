import * as path from 'path';
import * as os from 'os';

export interface PluginConfig {
  dbPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  autoCategorizationEnabled?: boolean;
}

/**
 * Load configuration from environment variables and defaults
 */
export function loadConfig(options?: Partial<PluginConfig>): PluginConfig {
  const dbPath = options?.dbPath ||
    process.env.AWESOME_PLUGIN_DB_PATH ||
    path.join(os.homedir(), '.awesome-plugin', 'data.db');

  const logLevel = (options?.logLevel ||
    process.env.AWESOME_PLUGIN_LOG_LEVEL ||
    'info') as PluginConfig['logLevel'];

  const autoCategorizationEnabled = options?.autoCategorizationEnabled ??
    (process.env.AWESOME_PLUGIN_AUTO_CATEGORIZATION !== 'false');

  return {
    dbPath,
    logLevel,
    autoCategorizationEnabled
  };
}
