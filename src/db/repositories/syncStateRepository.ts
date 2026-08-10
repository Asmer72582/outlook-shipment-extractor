import { db } from '@/db/database';
import type { SyncState } from '@/types/outlook';

const SYNC_STATE_ID = 1;

export const DEFAULT_SYNC_STATE: SyncState = {
  id: SYNC_STATE_ID,
  deltaLink: null,
  lastSyncAt: null,
  emailsChecked: 0,
  shipmentsCreated: 0,
  duplicates: 0,
  failedExtractions: 0,
};

/** Read-only — safe for useLiveQuery */
export async function readSyncState(): Promise<SyncState> {
  const state = await db.syncState.get(SYNC_STATE_ID);
  return state ?? DEFAULT_SYNC_STATE;
}

/** Ensures a record exists — use outside liveQuery only */
export async function ensureSyncState(): Promise<SyncState> {
  const existing = await db.syncState.get(SYNC_STATE_ID);
  if (existing) return existing;

  await db.syncState.put(DEFAULT_SYNC_STATE);
  return DEFAULT_SYNC_STATE;
}

export async function getSyncState(): Promise<SyncState> {
  return ensureSyncState();
}

export async function updateSyncState(
  updates: Partial<Omit<SyncState, 'id'>>
): Promise<SyncState> {
  const current = await ensureSyncState();
  const updated: SyncState = { ...current, ...updates };
  await db.syncState.put(updated);
  return updated;
}

export async function resetDeltaLink(): Promise<void> {
  await updateSyncState({ deltaLink: null });
}
