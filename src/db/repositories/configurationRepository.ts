import { db } from '@/db/database';
import type { ShipmentConfiguration, ShipmentConfigInput } from '@/types/configuration';
import { DEFAULT_CONFIGURATION } from '@/types/configuration';
import { migrateConfiguration } from '@/utils/configuration';

const CONFIG_ID = 1;

export function getDefaultConfiguration(): ShipmentConfiguration {
  return {
    id: CONFIG_ID,
    ...DEFAULT_CONFIGURATION,
    updatedAt: new Date().toISOString(),
  };
}

/** Read-only — safe for useLiveQuery */
export async function readConfiguration(): Promise<ShipmentConfiguration> {
  const config = await db.configuration.get(CONFIG_ID);
  if (!config) return getDefaultConfiguration();
  return migrateConfiguration(config);
}

/** Ensures a record exists — use outside liveQuery only */
export async function ensureConfiguration(): Promise<ShipmentConfiguration> {
  const existing = await db.configuration.get(CONFIG_ID);
  if (existing) return migrateConfiguration(existing);

  const defaultConfig = getDefaultConfiguration();
  await db.configuration.put(defaultConfig);
  return defaultConfig;
}

export async function getConfiguration(): Promise<ShipmentConfiguration> {
  return ensureConfiguration();
}

export async function saveConfiguration(data: ShipmentConfigInput): Promise<ShipmentConfiguration> {
  const config: ShipmentConfiguration = {
    id: CONFIG_ID,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.configuration.put(config);
  return config;
}
